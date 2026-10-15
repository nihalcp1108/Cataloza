import http from 'http';
import net from 'net';
import { exec, execSync } from 'child_process';
import path from 'path';

export interface ProcessInfo {
  pid: number;
  name: string;
  commandLine: string;
  isCataloza: boolean;
}

/**
 * Probes the Cataloza health endpoint on a given port.
 */
export const probeCatalozaHealth = (
  port: number,
  timeoutMs = 1500
): Promise<{ isRunning: boolean; isHealthy: boolean; details?: any }> => {
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
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (res.statusCode === 200 && data.status === 'healthy') {
              resolve({ isRunning: true, isHealthy: true, details: data });
              return;
            }
          } catch {
            // Not JSON
          }
          resolve({ isRunning: true, isHealthy: false });
        });
      }
    );

    req.on('error', () => {
      resolve({ isRunning: false, isHealthy: false });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ isRunning: false, isHealthy: false });
    });
  });
};

/**
 * Checks if a TCP port is currently listening.
 */
export const isPortListening = (port: number, timeoutMs = 500): Promise<boolean> => {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(timeoutMs);

    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.once('error', () => {
      resolve(false);
    });

    socket.connect(port, '127.0.0.1');
  });
};

/**
 * Inspects which process is listening on the given port (Windows & Unix).
 */
export const getProcessListeningOnPort = (port: number): Promise<ProcessInfo | null> => {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      exec(`netstat -ano | findstr :${port}`, (err, stdout) => {
        if (err || !stdout) {
          resolve(null);
          return;
        }

        const lines = stdout.split('\n');
        let matchedPid: number | null = null;

        for (const line of lines) {
          const trimmed = line.trim();
          // Look for LISTENING on exact port
          if (trimmed.includes('LISTENING')) {
            const parts = trimmed.split(/\s+/);
            const localAddress = parts[1] || '';
            const portPart = localAddress.split(':').pop();
            if (portPart === String(port)) {
              const pidStr = parts[parts.length - 1];
              const p = parseInt(pidStr, 10);
              if (!isNaN(p) && p > 0) {
                matchedPid = p;
                break;
              }
            }
          }
        }

        if (!matchedPid) {
          resolve(null);
          return;
        }

        // Query process details
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

          const lowerCmd = (commandLine || '').toLowerCase();
          const isCataloza =
            lowerCmd.includes('dist/server.js') ||
            lowerCmd.includes('dist\\server.js') ||
            lowerCmd.includes('src/server.ts') ||
            lowerCmd.includes('src\\server.ts') ||
            lowerCmd.includes('cateloge') ||
            lowerCmd.includes('cataloza');

          resolve({
            pid: matchedPid!,
            name,
            commandLine,
            isCataloza,
          });
        });
      });
    } else {
      // Unix: lsof -i :<port> -sTCP:LISTEN -t
      exec(`lsof -i :${port} -sTCP:LISTEN -t`, (err, stdout) => {
        if (err || !stdout) {
          resolve(null);
          return;
        }
        const pid = parseInt(stdout.trim().split('\n')[0], 10);
        if (isNaN(pid)) {
          resolve(null);
          return;
        }

        exec(`ps -p ${pid} -o comm=,args=`, (psErr, psStdout) => {
          const cmdLine = psStdout ? psStdout.trim() : '';
          const isCataloza =
            cmdLine.includes('dist/server.js') ||
            cmdLine.includes('src/server.ts') ||
            cmdLine.includes('cateloge') ||
            cmdLine.includes('cataloza');

          resolve({
            pid,
            name: 'node',
            commandLine: cmdLine,
            isCataloza,
          });
        });
      });
    }
  });
};

/**
 * Safely terminates ONLY an identified stale Cataloza process and its immediate tree.
 * NEVER kills all node processes.
 */
export const terminateStaleCataloza = (pid: number): Promise<boolean> => {
  return new Promise((resolve) => {
    if (pid <= 0 || pid === process.pid) {
      resolve(false);
      return;
    }

    const isWindows = process.platform === 'win32';
    const killCmd = isWindows ? `taskkill /PID ${pid} /T /F` : `kill -TERM ${pid}`;

    exec(killCmd, (err) => {
      resolve(!err);
    });
  });
};

/**
 * Polls until the port is released by the operating system.
 */
export const waitForPortRelease = async (port: number, maxWaitMs = 3000): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const listening = await isPortListening(port, 200);
    if (!listening) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
};
