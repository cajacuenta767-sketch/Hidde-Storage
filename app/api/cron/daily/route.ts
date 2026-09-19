import { NextResponse, type NextRequest } from 'next/server';

import { runDailyMaintenance } from '@/lib/maintenance';

export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  if (header === `Bearer ${secret}`) return true;
  return request.nextUrl.searchParams.get('secret') === secret;
}

async function handle(request: NextRequest) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json(
      { error: 'Configura CRON_SECRET para habilitar el mantenimiento.' },
      { status: 503 },
    );
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const summary = await runDailyMaintenance();
  return NextResponse.json({ ok: true, ...summary });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
