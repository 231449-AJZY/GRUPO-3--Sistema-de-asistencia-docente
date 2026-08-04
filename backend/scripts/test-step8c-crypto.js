'use strict';

const assert = require('assert');
const crypto = require('crypto');

const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
});

const payload = JSON.stringify({
  version: 1,
  type: 'UNSAAC_MOBILE_ATTENDANCE',
  challengeId: crypto.randomUUID(),
  nonce: crypto.randomBytes(32).toString('base64url'),
  target: 'INGRESO_INSTITUCIONAL',
});

const publicKeyDer = publicKey.export({
  format: 'der',
  type: 'spki',
});
const signature = crypto.sign(
  'sha256',
  Buffer.from(payload, 'utf8'),
  privateKey
);

const reconstructedPublicKey = crypto.createPublicKey({
  key: Buffer.from(publicKeyDer.toString('base64'), 'base64'),
  format: 'der',
  type: 'spki',
});

assert.strictEqual(
  crypto.verify(
    'sha256',
    Buffer.from(payload, 'utf8'),
    reconstructedPublicKey,
    Buffer.from(signature.toString('base64'), 'base64')
  ),
  true,
  'La firma ECDSA válida debe verificarse.'
);

assert.strictEqual(
  crypto.verify(
    'sha256',
    Buffer.from(`${payload}alterado`, 'utf8'),
    reconstructedPublicKey,
    signature
  ),
  false,
  'Un contenido alterado no debe verificar.'
);

console.log('Prueba criptográfica Paso 8C completada correctamente.');
