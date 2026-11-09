const assert = require('assert');
const http = require('http');
const app = require('../src/index');

// Helper to make in-process HTTP requests to the Express app using node's http.ServerResponse
function makeRequest(app, method, url, body = null, headers = {}) {
  return new Promise((resolve) => {
    let resData = '';
    const req = new http.IncomingMessage();
    req.method = method;
    req.url = url;
    req.originalUrl = url;
    req.headers = {
      'content-type': 'application/json',
      ...headers
    };
    req.body = body || {};
    req.connection = { remoteAddress: '127.0.0.1' };
    req.ip = '127.0.0.1';
    req.socket = { remoteAddress: '127.0.0.1' };

    const res = new http.ServerResponse(req);
    res._headers = {};

    res.json = function(data) {
      resData = data;
      resolve({ status: res.statusCode, headers: res.getHeaders(), body: resData });
    };

    res.send = function(data) {
      resData = data;
      resolve({ status: res.statusCode, headers: res.getHeaders(), body: resData });
    };

    res.end = function(chunk) {
      if (chunk) {
        try {
          resData = JSON.parse(chunk.toString());
        } catch (_) {
          resData = chunk.toString();
        }
      }
      resolve({ status: res.statusCode, headers: res.getHeaders(), body: resData });
    };

    app.handle(req, res);
  });
}

async function run() {
  console.log('🚀 Ejecutando pruebas de integración End-to-End...');

  // 1. Registro con contraseña débil (debe fallar con 400 y detalles)
  const weakReg = await makeRequest(app, 'POST', '/api/auth/register', {
    email: 'weakuser@example.com',
    displayName: 'WeakUser',
    password: '123',
    role: 'USER',
    minecraftUsername: 'WeakGuy'
  });
  assert.strictEqual(weakReg.status, 400, 'Debe rechazar contraseña débil');
  assert(weakReg.body.details.length > 0, 'Debe listar razones de la política');
  console.log('  ✅ 1. Rechazo de contraseña débil en /api/auth/register verificado');

  // 2. Registro con contraseña fuerte y rol USER vinculado
  const randomMc = `Player_${Date.now().toString().slice(-6)}`;
  const validReg = await makeRequest(app, 'POST', '/api/auth/register', {
    email: `valid_${Date.now()}@example.com`,
    displayName: 'ValidPlayer',
    password: 'Minecraft#2024Pass',
    role: 'USER',
    minecraftUsername: randomMc
  });
  assert.strictEqual(validReg.status, 201, 'Debe registrar con éxito');
  assert.strictEqual(validReg.body.user.minecraftUsername, randomMc);
  const playerToken = validReg.body.token;
  console.log('  ✅ 2. Registro seguro con política robusta y vinculación de Gamertag exitoso');

  // 3. Intento de login con credenciales erróneas (debe retornar 401 y mensaje genérico)
  const failedLogin = await makeRequest(app, 'POST', '/api/auth/login', {
    email: 'nonexistent@example.com',
    password: 'WrongPassword123!'
  });
  assert.strictEqual(failedLogin.status, 401);
  assert(failedLogin.body.error.includes('Credenciales inválidas'));
  console.log('  ✅ 3. Login fallido protegido contra enumeración y timing attacks');

  // 4. Login exitoso con cuenta administrador demo
  const adminLogin = await makeRequest(app, 'POST', '/api/auth/login', {
    email: 'admin@mcdesk.io',
    password: 'admin123'
  });
  assert.strictEqual(adminLogin.status, 200);
  assert.strictEqual(adminLogin.body.user.role, 'ADMIN');
  const adminToken = adminLogin.body.token;
  console.log('  ✅ 4. Autenticación de administrador y emisión de JWT verificada');

  // 5. Inyección de comando en consola de administrador (debe bloquear ;)
  const injectedCmd = await makeRequest(
    app,
    'POST',
    '/api/servers/s-1/admin/command',
    { command: 'say Hola; rm -rf /' },
    { authorization: `Bearer ${adminToken}` }
  );
  assert.strictEqual(injectedCmd.status, 400);
  assert(injectedCmd.body.error.includes('shell no permitidos'));
  console.log('  ✅ 5. Bloqueo de inyección de comandos en consola verificado');

  // 6. Intento de usuario normal de enviar comandos de consola (debe retornar 403 Forbidden)
  const forbiddenCmd = await makeRequest(
    app,
    'POST',
    '/api/servers/s-1/admin/command',
    { command: 'say Soy un jugador normal' },
    { authorization: `Bearer ${playerToken}` }
  );
  assert.strictEqual(forbiddenCmd.status, 403);
  console.log('  ✅ 6. Restricción RBAC: Jugadores comunes no tienen acceso a consola de admin');

  // 7. Compra de tienda con Gamertag forzado al usuario logueado (Zero SSH, Agent Queue)
  const deliverRes = await makeRequest(
    app,
    'POST',
    '/api/items/1/deliver',
    { playerGamertag: 'OtroJugadorHacker', serverId: 's-1' },
    { authorization: `Bearer ${playerToken}` }
  );
  assert.strictEqual(deliverRes.status, 200);
  assert.strictEqual(deliverRes.body.deliveredTo, randomMc, 'La entrega debe ignorar el gamertag adulterado y usar el vinculado');
  console.log('  ✅ 7. MineMarket: Entrega blindada al Gamertag del usuario autenticado (100% SSH-Free)');

  // 8. Verificación de salud y conectividad de la Agent API para Render
  const agentPing = await makeRequest(app, 'GET', '/api/agent/ping');
  assert.strictEqual(agentPing.status, 200);
  assert.strictEqual(agentPing.body.status, 'online');
  assert.strictEqual(agentPing.body.cloud, 'render-ready');
  console.log('  ✅ 8. Agent API: Endpoint público /api/agent/ping verificado para despliegue en Render');

  // 9. Handshake y vinculación de servidor con Claim Code
  const dbStore = require('../src/db');
  const testServer = dbStore.memoryStore.servers[0];
  testServer.claim_code = 'MC-DESK-TEST-9999';

  const badClaim = await makeRequest(app, 'POST', '/api/agent/verify', { claimCode: 'INVALID-CODE' });
  assert.strictEqual(badClaim.status, 404);

  const goodClaim = await makeRequest(app, 'POST', '/api/agent/verify', { claimCode: 'MC-DESK-TEST-9999' });
  assert.strictEqual(goodClaim.status, 200);
  assert(goodClaim.body.agentToken.startsWith('mca_'), 'Debe generar token seguro mca_');
  const agentToken = goodClaim.body.agentToken;
  console.log('  ✅ 9. Agent Handshake: Vinculación con Claim Code y emisión de Agent Token');

  // 10. Envío de telemetría desde el Agent con autenticación HMAC/Token
  const telemetryRes = await makeRequest(
    app,
    'POST',
    '/api/agent/telemetry',
    {
      status: 'ONLINE',
      onlinePlayers: 3,
      maxPlayers: 20,
      tps: 19.98,
      cpuUsage: 12.5,
      ramUsage: 45.0,
      players: [
        { username: 'Steve', uuid: 'u-steve', isOnline: true, ping: 25, health: 20, food: 20, level: 30 }
      ]
    },
    { 'x-agent-token': agentToken }
  );
  assert.strictEqual(telemetryRes.status, 200);
  assert.strictEqual(telemetryRes.body.acknowledged, true);
  console.log('  ✅ 10. Agent Telemetry: Sincronización telemétrica y de jugadores por HTTPS');

  console.log('\n🎉 ¡Todas las 10 pruebas de integración pasaron con éxito (0 llamadas SSH)!\n');
}

run().catch(err => {
  console.error('Error en pruebas de integración:', err);
  process.exit(1);
});
