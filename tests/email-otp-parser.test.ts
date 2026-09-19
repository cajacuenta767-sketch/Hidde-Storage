import assert from 'node:assert/strict';
import test from 'node:test';

import { extractEmailOtp, isAllowedNetflixSender } from '../lib/integrations/email-otp-parser.ts';

void test('extrae un código contextual sin confundir números aislados', () => {
  assert.equal(extractEmailOtp('Your Netflix sign-in code is 482913. It expires soon.'), '482913');
  assert.equal(extractEmailOtp('Tu código de acceso es: 7452'), '7452');
  assert.equal(extractEmailOtp('Factura 20260904'), null);
});

void test('solo permite remitentes del dominio oficial de Netflix', () => {
  assert.equal(isAllowedNetflixSender('info@account.netflix.com'), true);
  assert.equal(isAllowedNetflixSender('netflix@example.com'), false);
});
