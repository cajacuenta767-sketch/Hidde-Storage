import 'server-only';

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

import { extractEmailOtp, isAllowedNetflixSender } from '@/lib/integrations/email-otp-parser';

export type EmailOtpProvider = 'imap' | 'notletters_api';

type InboxCredentials = {
  provider: EmailOtpProvider;
  host: string;
  email: string;
  password: string;
};

type NotLettersLetter = {
  sender: string;
  subject: string;
  text: string;
  html: string;
  receivedAt: Date;
};

const NOTLETTERS_API_URL = 'https://api.notletters.com/v1/letters';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(record: Record<string, unknown>, key: string) {
  return typeof record[key] === 'string' ? record[key] : '';
}

function parseNotLettersResponse(payload: unknown): NotLettersLetter[] {
  if (!isRecord(payload) || !isRecord(payload.data) || !Array.isArray(payload.data.letters)) {
    throw new Error('NOTLETTERS_INVALID_RESPONSE');
  }

  return payload.data.letters.flatMap((value) => {
    if (!isRecord(value) || !isRecord(value.letter)) return [];
    const receivedAt = new Date(readString(value, 'date'));
    if (Number.isNaN(receivedAt.getTime())) return [];
    return [{
      sender: readString(value, 'sender'),
      subject: readString(value, 'subject'),
      text: readString(value.letter, 'text'),
      html: readString(value.letter, 'html'),
      receivedAt,
    }];
  });
}

async function getNotLettersMessages(credentials: InboxCredentials) {
  const apiToken = process.env.NOTLETTERS_API_TOKEN?.trim();
  if (!apiToken) throw new Error('NOTLETTERS_API_TOKEN_MISSING');

  const response = await fetch(NOTLETTERS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
      filters: { search: 'Netflix', star: false },
    }),
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) throw new Error(`NOTLETTERS_API_${response.status}`);
  return parseNotLettersResponse(await response.json());
}

function createClient(credentials: InboxCredentials, verifyOnly = false) {
  const client = new ImapFlow({
    host: credentials.host,
    port: 993,
    secure: true,
    auth: { user: credentials.email, pass: credentials.password },
    logger: false,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    disableAutoIdle: true,
    verifyOnly,
  });
  client.on('error', () => undefined);
  return client;
}

export async function verifyOtpInbox(credentials: InboxCredentials) {
  if (credentials.provider === 'notletters_api') {
    await getNotLettersMessages(credentials);
    return true;
  }
  const client = createClient(credentials, true);
  try {
    await client.connect();
    return true;
  } finally {
    if (client.authenticated) await client.logout().catch(() => undefined);
  }
}

export async function findLatestNetflixOtp(
  credentials: InboxCredentials,
  requestedAfter: Date,
) {
  if (credentials.provider === 'notletters_api') {
    const messages = await getNotLettersMessages(credentials);
    const recentMessages = messages
      .filter((message) => message.receivedAt >= requestedAfter)
      .sort((left, right) => right.receivedAt.getTime() - left.receivedAt.getTime());

    for (const message of recentMessages) {
      if (!isAllowedNetflixSender(message.sender)) continue;
      const code = extractEmailOtp(`${message.subject} ${message.text} ${message.html}`);
      if (code) return { code, receivedAt: message.receivedAt.getTime() };
    }
    return null;
  }

  const client = createClient(credentials);
  try {
    await client.connect();
    const mailbox = await client.mailboxOpen('INBOX', { readOnly: true });
    if (!mailbox.exists) return null;
    const first = Math.max(1, mailbox.exists - 14);
    for (let sequence = mailbox.exists; sequence >= first; sequence -= 1) {
      const message = await client.fetchOne(String(sequence), {
        envelope: true,
        internalDate: true,
        source: true,
      });
      if (!message || !message.source) continue;
      const rawMessageDate = message.internalDate ?? message.envelope?.date ?? new Date(0);
      const messageDate = rawMessageDate instanceof Date ? rawMessageDate : new Date(rawMessageDate);
      if (messageDate < requestedAfter) continue;
      const sender = message.envelope?.from?.[0]?.address ?? '';
      if (!isAllowedNetflixSender(sender)) continue;
      const parsed = await simpleParser(message.source);
      const code = extractEmailOtp(`${parsed.subject ?? ''} ${parsed.text ?? ''} ${parsed.html || ''}`);
      if (code) return { code, receivedAt: messageDate.getTime() };
    }
    return null;
  } finally {
    if (client.authenticated) await client.logout().catch(() => undefined);
  }
}
