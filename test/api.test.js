const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

async function waitForServer(url, attempts = 20) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch (error) {
      // Aguarda a inicialização do servidor
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error('Servidor não respondeu a tempo');
}

test('API responde com health e departamentos', async () => {
  const server = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '3100' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForServer('http://127.0.0.1:3100/api/health');

    const healthResponse = await fetch('http://127.0.0.1:3100/api/health');
    const health = await healthResponse.json();
    assert.equal(health.status, 'ok');

    const departmentsResponse = await fetch('http://127.0.0.1:3100/api/departments');
    const departments = await departmentsResponse.json();
    assert.ok(Array.isArray(departments));
    assert.ok(departments.length > 0);
  } finally {
    server.kill('SIGTERM');
  }
});
