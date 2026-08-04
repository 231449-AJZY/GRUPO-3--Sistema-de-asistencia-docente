try {
  require('dotenv').config();
} catch {
  // La prueba criptográfica también puede ejecutarse sin node_modules.
}
const assert = require('assert');
const {
  calculateBleToken,
  createStationSecret,
  decryptStationSecret,
  encryptStationSecret,
} = require('../src/services/ble-presence.service');

function run() {
  const secret = createStationSecret();
  assert.strictEqual(secret.length, 32);

  const protectedSecret = encryptStationSecret(secret);
  const restored = decryptStationSecret({
    secreto_cifrado: protectedSecret.encrypted,
    secreto_iv: protectedSecret.iv,
    secreto_tag: protectedSecret.tag,
  });
  assert.deepStrictEqual(restored, secret);

  const tokenA = calculateBleToken(secret, 7, 123456);
  const tokenB = calculateBleToken(secret, 7, 123456);
  const tokenC = calculateBleToken(secret, 7, 123457);

  assert.match(tokenA, /^[a-f0-9]{16}$/);
  assert.strictEqual(tokenA, tokenB);
  assert.notStrictEqual(tokenA, tokenC);

  console.log(
    'Prueba BLE correcta: AES-256-GCM y HMAC rotativo operativos.'
  );
}

try {
  run();
} catch (error) {
  console.error('Prueba BLE fallida:', error.message);
  process.exitCode = 1;
}
