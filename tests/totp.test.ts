import assert from 'node:assert/strict';
import test from 'node:test';

import { generateTotp, normalizeTotpSecret } from '../lib/security/totp.ts';

const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

test('genera los códigos del vector RFC 6238', () => {
  assert.equal(generateTotp(RFC_SECRET, 59_000, { digits: 8 }).code, '94287082');
  assert.equal(generateTotp(RFC_SECRET, 1_111_111_109_000, { digits: 8 }).code, '07081804');
});

test('normaliza una clave Base32 sin exponerla', () => {
  assert.equal(normalizeTotpSecret('jbsw y3dp-ehpk3pxp'), 'JBSWY3DPEHPK3PXP');
  assert.throws(() => normalizeTotpSecret('clave-no-valida!'));
});
