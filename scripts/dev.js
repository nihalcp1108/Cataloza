const http = require('http');
const net = require('net');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');

// Load environment variables from backend/.env manually if dotenv is not in root
const envFile = path.join(BACKEND_DIR, '.env');
const envVars = {};
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const k = trimmed.substring(0, eqIdx).trim();
        const v = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        envVars[k] = v;
      }
    }
  }
}

const PORT = parseInt(process.env.PORT || envVars.PORT || '5001', 10);
const FRONTEND_PORT = 5173;

const spawnedPids = new Set();
let isExiting = false;

function probeHealth(port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/v1/health',
        timeout: timeoutMs,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (res.statusCode === 200 && data.status === 'healthy') {
              resolve({ isRunning: true, isHealthy: true, data });
              return;
            }
          } catch {}
          resolve({ isRunning: true, isHealthy: false });
        });
      }
    );
    req.on('error', () => resolve({ isRunning: false, isHealthy: false }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ isRunning: false, isHealthy: false });
    });
  });
}

function isPortListening(port) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    s.setTimeout(400);
    s.once('connect', () => {
      s.destroy();
      resolve(true);
    });
    s.once('timeout', () => {
      s.destroy();
      resolve(false);
    });
    s.once('error', () => resolve(false));
    s.connect(port, '127.0.0.1');
  });
}

function getProcessOnPort(port) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec(`netstat -ano | findstr :${port}`, (err, stdout) => {
        if (err || !stdout) return resolve(null);
        const lines = stdout.split('\n');
        let matchedPid = null;
        for (const line of lines) {
          if (line.includes('LISTENING')) {
            const parts = line.trim().split(/\s+/);
            const portPart = (parts[1] || '').split(':').pop();
            if (portPart === String(port)) {
              matchedPid = parseInt(parts[parts.length - 1], 10);
              break;
            }
          }
        }
        if (!matchedPid) return resolve(null);

        const psCmd = `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter 'ProcessId = ${matchedPid}' | Select-Object ProcessId, Name, CommandLine | ConvertTo-Json -Compress"`;
        exec(psCmd, (psErr, psStdout) => {
          let name = 'node.exe';
          let commandLine = '';
          if (!psErr && psStdout) {
            try {
              const parsed = JSON.parse(psStdout.trim());
              name = parsed.Name || name;
              commandLine = parsed.CommandLine || '';
            } catch {
              commandLine = psStdout.trim();
            }
          }
          const lower = (commandLine || '').toLowerCase();
          const isCataloza =
            lower.includes('dist/server.js') ||
            lower.includes('dist\\server.js') ||
            lower.includes('src/server.ts') ||
            lower.includes('cateloge') ||
            lower.includes('cataloza');
          resolve({ pid: matchedPid, name, commandLine, isCataloza });
        });
      });
    } else {
      exec(`lsof -i :${port} -sTCP:LISTEN -t`, (err, stdout) => {
        if (err || !stdout) return resolve(null);
        const pid = parseInt(stdout.trim().split('\n')[0], 10);
        if (isNaN(pid)) return resolve(null);
        exec(`ps -p ${pid} -o comm=,args=`, (pErr, pStdout) => {
          const cmd = pStdout ? pStdout.trim() : '';
          const isCataloza = cmd.includes('server') || cmd.includes('cateloge') || cmd.includes('cataloza');
          resolve({ pid, name: 'node', commandLine: cmd, isCataloza });
        });
      });
    }
  });
}

function terminatePid(pid) {
  return new Promise((resolve) => {
    if (!pid || pid <= 0) return resolve(false);
    const cmd = process.platform === 'win32' ? `taskkill /PID ${pid} /T /F` : `kill -TERM ${pid}`;
    exec(cmd, () => resolve(true));
  });
}

async function waitForPortFree(port, maxWaitMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const listening = await isPortListening(port);
    if (!listening) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}

async function cleanupAndExit() {
  if (isExiting) return;
  isExiting = true;
  console.log('\n[Dev] Gracefully stopping development servers...');

  for (const pid of spawnedPids) {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
      } else {
        process.kill(pid, 'SIGTERM');
      }
    } catch {}
  }
  console.log('[Dev] Development session ended cleanly.');
  process.exit(0);
}

process.on('SIGINT', cleanupAndExit);
process.on('SIGTERM', cleanupAndExit);

async function main() {
  console.log('============================================================');
  console.log('🌟 CATALOZA UNIFIED DEVELOPMENT SERVER');
  console.log('============================================================');

  // Check if TypeScript build is needed
  const distServer = path.join(BACKEND_DIR, 'dist', 'server.js');
  if (!fs.existsSync(distServer)) {
    console.log('[Dev] Building backend TypeScript...');
    execSync('npm run build', { cwd: BACKEND_DIR, stdio: 'inherit' });
  }

  // 1. Check backend status
  let backendAlreadyRunning = false;
  const probe = await probeHealth(PORT);

  if (probe.isRunning && probe.isHealthy) {
    console.log(`[Dev] ✅ Cataloza backend is already active and healthy on port ${PORT}.`);
    console.log(`[Dev] 🔗 Reusing running instance (uptime: ${Math.round(probe.data?.uptime || 0)}s).`);
    backendAlreadyRunning = true;
  } else {
    const proc = await getProcessOnPort(PORT);
    if (proc) {
      if (!proc.isCataloza) {
        console.error('============================================================');
        console.error(`[Dev] ❌ Port ${PORT} is occupied by an unrelated application:`);
        console.error(`      Process ID:   ${proc.pid}`);
        console.error(`      Process Name: ${proc.name}`);
        if (proc.commandLine) {
          console.error(`      CommandLine:  ${proc.commandLine.slice(0, 120)}`);
        }
        console.error(`[Dev] Cataloza will NEVER terminate unrelated applications.`);
        console.error(`[Dev] Please free port ${PORT} or configure a different PORT in backend/.env.`);
        console.error('============================================================');
        process.exit(1);
      } else {
        console.warn(`[Dev] ⚠️ Found stale Cataloza process on port ${PORT} (PID ${proc.pid}).`);
        console.warn(`[Dev] Shutting down stale process ${proc.pid}...`);
        await terminatePid(proc.pid);
        await waitForPortFree(PORT);
      }
    }

    // Spawn Backend
    console.log(`[Dev] Starting Cataloza backend on port ${PORT}...`);
    const backendProc = spawn(process.platform === 'win32' ? 'node.exe' : 'node', ['dist/server.js'], {
      cwd: BACKEND_DIR,
      stdio: 'inherit',
      env: { ...process.env, ...envVars, PORT: String(PORT) },
    });

    if (backendProc.pid) {
      spawnedPids.add(backendProc.pid);
    }

    backendProc.on('exit', (code) => {
      if (!isExiting && code !== 0) {
        console.error(`[Dev] Backend exited with code ${code}`);
      }
    });

    // Wait for backend to be healthy
    let ready = false;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 400));
      const p = await probeHealth(PORT);
      if (p.isHealthy) {
        ready = true;
        break;
      }
    }
    if (ready) {
      console.log(`[Dev] ✅ Backend initialized and responding on http://localhost:${PORT}/api/v1`);
    }
  }

  // 2. Check and start Frontend
  const frontendListening = await isPortListening(FRONTEND_PORT);
  if (frontendListening) {
    console.log(`[Dev] ℹ️ Frontend server is already running on http://localhost:${FRONTEND_PORT}`);
  } else {
    console.log(`[Dev] Starting Vite frontend server...`);
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const frontendProc = spawn(npmCmd, ['run', 'dev'], {
      cwd: FRONTEND_DIR,
      stdio: 'inherit',
      env: { ...process.env, VITE_API_BASE_URL: '/api/v1' },
    });

    if (frontendProc.pid) {
      spawnedPids.add(frontendProc.pid);
    }

    frontendProc.on('exit', (code) => {
      if (!isExiting && code !== 0) {
        console.error(`[Dev] Frontend exited with code ${code}`);
      }
    });
  }

  // 3. Display summary banner
  console.log('\n============================================================');
  console.log('✨ CATALOZA DEVELOPMENT ENVIRONMENT READY');
  console.log('============================================================');
  console.log(`📡 Backend API:      http://localhost:${PORT}/api/v1`);
  console.log(`🏥 Health Endpoint:  http://localhost:${PORT}/api/v1/health`);
  console.log(`💻 Frontend App:     http://localhost:${FRONTEND_PORT}`);
  console.log(`🛍️ Storefront Demo:  http://localhost:${FRONTEND_PORT}/rocoware`);
  console.log(`🔒 Shop Admin:       http://localhost:${FRONTEND_PORT}/admin/login`);
  console.log(`👑 Super Admin:      http://localhost:${FRONTEND_PORT}/superadmin/login`);
  console.log('============================================================');
  console.log('💡 Press Ctrl+C at any time to stop child servers cleanly.\n');
}

main().catch((err) => {
  console.error('[Dev] Startup failure:', err);
  process.exit(1);
});
