#!/usr/bin/env node
import { spawn } from 'node:child_process';
import net from 'node:net';
import http from 'node:http';
import path from 'node:path';

const MAX_RESTARTS = 5;
const HEALTH_PATHS = ['/api/ok', '/'];
const BASE_PORT = parseInt(process.env.PORT || process.env.npm_config_port || '3000', 10) || 3000;
const MAX_PORT = BASE_PORT + 20;

function checkPort(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, '127.0.0.1');
  });
}

async function findOpenPort() {
  for (let p = BASE_PORT; p <= MAX_PORT; p++) {
    // If PORT env is explicitly set, use it regardless of availability check
    if (process.env.PORT && p === BASE_PORT) return p;
    // Otherwise, pick first open port
    // eslint-disable-next-line no-await-in-loop
    if (await checkPort(p)) return p;
  }
  throw new Error(`No open port found between ${BASE_PORT}-${MAX_PORT}`);
}

function ping(url, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      // Consider 2xx-5xx as "responding" (server alive)
      if (res.statusCode) {
        res.resume();
        resolve({ ok: true, status: res.statusCode });
      } else {
        resolve({ ok: false, error: 'no-status' });
      }
    });
    req.on('error', () => resolve({ ok: false }));
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('timeout'));
      resolve({ ok: false, error: 'timeout' });
    });
  });
}

async function waitUntilReady(port, tries = 60) {
  const urls = HEALTH_PATHS.map((p) => `http://127.0.0.1:${port}${p}`);
  for (let i = 0; i < tries; i++) {
    // eslint-disable-next-line no-await-in-loop
    for (const u of urls) { // try all health URLs each pass
      // eslint-disable-next-line no-await-in-loop
      const r = await ping(u);
      if (r.ok) return true;
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function spawnNext(port) {
  const nextBin = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
  const args = [nextBin, 'dev', '-p', String(port)];
  const child = spawn(process.execPath, args, {
    stdio: 'inherit',
    env: { ...process.env, PORT: String(port) },
    cwd: process.cwd(),
  });
  return child;
}

async function ensurePatchWatcher() {
  // Fire-and-forget patch watcher to fix dev runtime chunk path when needed
  const patchPath = path.join(process.cwd(), 'scripts', 'patch-next-runtime-dev.mjs');
  const child = spawn(process.execPath, [patchPath], { stdio: 'inherit', env: process.env, cwd: process.cwd() });
  child.on('error', () => {});
}

async function main() {
  let restarts = 0;
  let currentPort = await findOpenPort();

  console.log(`[dev-smart] Starting Next dev on port ${currentPort}...`);
  await ensurePatchWatcher();
  let child = spawnNext(currentPort);

  const restart = async (reason) => {
    if (child && !child.killed) {
      try { child.kill('SIGTERM'); } catch {}
    }
    restarts += 1;
    if (restarts > MAX_RESTARTS) {
      console.error(`[dev-smart] Max restarts exceeded. Last reason: ${reason}`);
      process.exit(1);
    }
    // Try to keep same port unless taken; otherwise find another
    const samePortFree = await checkPort(currentPort);
    currentPort = samePortFree ? currentPort : await findOpenPort();
    console.log(`[dev-smart] Restarting on port ${currentPort} (reason: ${reason})...`);
    await ensurePatchWatcher();
    child = spawnNext(currentPort);
    // After restart, wait again for readiness asynchronously
    (async () => {
      const ok = await waitUntilReady(currentPort, 30);
      if (ok) console.log(`[dev-smart] Dev server is responding at http://localhost:${currentPort}`);
      else console.warn('[dev-smart] Still not responding after restart');
    })();
  };

  child.on('exit', (code, signal) => {
    console.warn(`[dev-smart] Next dev exited (code=${code}, signal=${signal})`);
    restart(`exit code ${code ?? 'null'} signal ${signal ?? 'null'}`);
  });
  child.on('error', (err) => {
    console.error('[dev-smart] Failed to start Next dev:', err?.message || err);
    restart('spawn-error');
  });

  // Initial readiness wait
  const isReady = await waitUntilReady(currentPort, 60);
  if (isReady) {
    console.log(`[dev-smart] Dev server is ready at http://localhost:${currentPort}`);
  } else {
    console.warn('[dev-smart] Dev server not responding, attempting restart...');
    await restart('not-responding');
  }

  // Keep simple watchdog pings; if 5 consecutive failures, restart
  let consecutiveFails = 0;
  setInterval(async () => {
    const ok = await waitUntilReady(currentPort, 2);
    if (ok) {
      if (consecutiveFails) consecutiveFails = 0;
      return;
    }
    consecutiveFails += 1;
    if (consecutiveFails >= 5) {
      consecutiveFails = 0;
      await restart('watchdog');
    }
  }, 5000);

  // Graceful shutdown
  const stop = () => {
    if (child && !child.killed) {
      try { child.kill('SIGTERM'); } catch {}
    }
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((e) => {
  console.error('[dev-smart] Fatal:', e?.message || e);
  process.exit(1);
});

