const crypto = require('crypto');

function verify(publicKeyBase64, payload, signatureBase64) {
  const publicKey = crypto.createPublicKey({
    key: Buffer.from(publicKeyBase64, 'base64'),
    format: 'der',
    type: 'spki',
  });

  return crypto.verify(
    'sha256',
    Buffer.from(payload, 'utf8'),
    publicKey,
    Buffer.from(signatureBase64, 'base64')
  );
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  publicKeyEncoding: { type: 'spki', format: 'der' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const payload = JSON.stringify({
  version: 1,
  type: 'UNSAAC_OFFLINE_ATTENDANCE',
  localId: crypto.randomUUID(),
  sequence: 1,
  estimatedAt: new Date().toISOString(),
});

const signature = crypto
  .sign('sha256', Buffer.from(payload, 'utf8'), privateKey)
  .toString('base64');

if (!verify(publicKey.toString('base64'), payload, signature)) {
  throw new Error('La firma ECDSA offline válida no pudo verificarse.');
}

if (
  verify(
    publicKey.toString('base64'),
    `${payload}alterado`,
    signature
  )
) {
  throw new Error('Una carga alterada fue aceptada incorrectamente.');
}

console.log(
  'Prueba offline correcta: ECDSA P-256 detecta contenido válido y alterado.'
);
