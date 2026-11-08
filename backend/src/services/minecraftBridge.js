const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const SOCKET_PATH = config.mcSocketPath || '/tmp/ssh_mux_mcserver';
const REMOTE_HOST = config.mcRemoteHost || '127.0.0.1';
const REMOTE_USER = config.mcRemoteUser || 'mcadmin';
const REMOTE_PASS = config.mcRemotePass || '';
const REMOTE_DIR = config.mcServerDir || `/home/${REMOTE_USER}/minecraft`;
const REMOTE_BACKUPS_DIR = config.mcBackupsDir || `/home/${REMOTE_USER}/backups`;
const REMOTE_COLLECTOR = config.mcCollectorScript || `/home/${REMOTE_USER}/mc_desk_collector.py`;

let cachedData = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 1500; // 1.5 seconds cache for fast updates

function ensureSshMaster() {
  if (!REMOTE_HOST) return false;

  if (fs.existsSync(SOCKET_PATH)) {
    try {
      execSync(`ssh -S ${SOCKET_PATH} -O check ${REMOTE_USER}@${REMOTE_HOST} 2>/dev/null`);
      return true;
    } catch (e) {
      // Socket dead, remove
      try { fs.unlinkSync(SOCKET_PATH); } catch (_) {}
    }
  }

  // Spawn master via Python pty helper script
  try {
    const scriptPath = path.join(__dirname, 'spawn_ssh_master.py');
    execSync(`python3 "${scriptPath}"`, {
      timeout: 12000,
      stdio: 'pipe',
      env: {
        ...process.env,
        MC_REMOTE_HOST: REMOTE_HOST,
        MC_REMOTE_USER: REMOTE_USER,
        MC_REMOTE_PASS: REMOTE_PASS,
        MC_SOCKET_PATH: SOCKET_PATH
      }
    });
    return fs.existsSync(SOCKET_PATH);
  } catch (err) {
    console.error('[MinecraftBridge] Error initializing SSH master connection:', err.message);
    return false;
  }
}

async function fetchLiveServerData() {
  const now = Date.now();
  if (cachedData && (now - lastFetchTime) < CACHE_TTL_MS) {
    return cachedData;
  }

  ensureSshMaster();

  return new Promise((resolve) => {
    const cmd = `ssh -S ${SOCKET_PATH} ${REMOTE_USER}@${REMOTE_HOST} "${REMOTE_COLLECTOR}"`;
    exec(cmd, { timeout: 6000 }, (error, stdout, stderr) => {
      if (error || !stdout) {
        console.warn('[MinecraftBridge] Failed to fetch remote data, using cache/fallback:', error?.message);
        if (cachedData) return resolve(cachedData);
        return resolve(null);
      }

      try {
        const data = JSON.parse(stdout.trim());
        cachedData = data;
        lastFetchTime = Date.now();
        resolve(data);
      } catch (parseErr) {
        console.error('[MinecraftBridge] Failed to parse remote collector JSON:', parseErr.message);
        resolve(cachedData);
      }
    });
  });
}

async function executeRemoteCommand(rawCommand) {
  ensureSshMaster();
  const safeCmd = rawCommand.replace(/"/g, '\\"').replace(/'/g, "\\'");
  
  return new Promise((resolve) => {
    const cmd = `ssh -S ${SOCKET_PATH} ${REMOTE_USER}@${REMOTE_HOST} '${REMOTE_COLLECTOR} cmd "${safeCmd}"'`;
    exec(cmd, { timeout: 8000 }, (error, stdout, stderr) => {
      if (error || !stdout) {
        return resolve({ success: false, error: error?.message || 'Error executing remote command' });
      }
      try {
        const res = JSON.parse(stdout.trim());
        resolve(res);
      } catch (e) {
        resolve({ success: true, message: stdout.trim() });
      }
    });
  });
}

async function wakeRemoteServer() {
  ensureSshMaster();

  return new Promise((resolve) => {
    const cmd = `ssh -S ${SOCKET_PATH} ${REMOTE_USER}@${REMOTE_HOST} "${REMOTE_COLLECTOR} wake"`;
    exec(cmd, { timeout: 8000 }, (error, stdout, stderr) => {
      if (error || !stdout) {
        return resolve({ success: false, error: error?.message || 'Error waking remote server' });
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (e) {
        resolve({ success: true, message: stdout.trim() });
      }
    });
  });
}

async function listRemoteBackups() {
  ensureSshMaster();

  return new Promise((resolve) => {
    const cmd = `ssh -S ${SOCKET_PATH} ${REMOTE_USER}@${REMOTE_HOST} "ls -l --time-style=full-iso ${REMOTE_BACKUPS_DIR}/*.tar.gz 2>/dev/null"`;
    exec(cmd, { timeout: 6000 }, (error, stdout) => {
      if (error || !stdout) {
        return resolve([]);
      }
      const lines = stdout.trim().split('\n');
      const backups = lines.map(line => {
        const parts = line.split(/\s+/);
        if (parts.length >= 9) {
          const sizeBytes = parseInt(parts[4], 10) || 0;
          const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(1) + ' MB';
          const fullPath = parts.slice(8).join(' ');
          const filename = path.basename(fullPath);
          const date = parts[5] + ' ' + parts[6].split('.')[0];
          return { filename, size: sizeMb, date };
        }
        return null;
      }).filter(Boolean);
      resolve(backups.reverse());
    });
  });
}

async function createRemoteBackup() {
  ensureSshMaster();

  return new Promise((resolve) => {
    const cmd = `ssh -S ${SOCKET_PATH} ${REMOTE_USER}@${REMOTE_HOST} "/usr/local/bin/mc-backup"`;
    exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
      if (error && !stdout) {
        return resolve({ success: false, error: error?.message || 'Error al generar backup' });
      }
      const text = stdout || stderr || '';
      resolve({ success: true, message: text.trim() });
    });
  });
}

async function getServerProperties() {
  ensureSshMaster();

  return new Promise((resolve) => {
    const cmd = `ssh -S ${SOCKET_PATH} ${REMOTE_USER}@${REMOTE_HOST} "${REMOTE_COLLECTOR} get_props"`;
    exec(cmd, { timeout: 8000 }, (error, stdout, stderr) => {
      if (error || !stdout) {
        return resolve({});
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (e) {
        console.error('[MinecraftBridge] Error parsing get_props JSON:', e.message);
        resolve({});
      }
    });
  });
}

async function updateServerProperties(properties) {
  ensureSshMaster();
  const b64 = Buffer.from(JSON.stringify(properties || {})).toString('base64');

  return new Promise((resolve) => {
    const cmd = `ssh -S ${SOCKET_PATH} ${REMOTE_USER}@${REMOTE_HOST} "${REMOTE_COLLECTOR} set_props ${b64}"`;
    exec(cmd, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error || !stdout) {
        return resolve({ success: false, error: error?.message || stderr || 'Error updating server.properties' });
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (e) {
        resolve({ success: true, message: stdout.trim() });
      }
    });
  });
}

async function executeStealthGamemode(player, mode) {
  ensureSshMaster();
  const safePlayer = (player || '').replace(/[^a-zA-Z0-9_]/g, '');
  const safeMode = ['survival', 'creative', 'spectator', 'adventure'].includes(mode) ? mode : 'survival';

  const pyCode = `
import subprocess, time

player = "${safePlayer}"
mode = "${safeMode}"
server_dir = "${REMOTE_DIR}"

# 1. Enviar comando a screen
subprocess.run(["screen", "-S", "minecraft", "-p", "0", "-X", "stuff", f"gamemode {mode} {player}\\n"])
time.sleep(1)

# 2. Limpiar buffer y scrollback de screen
subprocess.run(["screen", "-S", "minecraft", "-p", "0", "-X", "clear"])
subprocess.run(["screen", "-S", "minecraft", "-p", "0", "-X", "colon", "scrollback 0\\r"])
subprocess.run(["screen", "-S", "minecraft", "-p", "0", "-X", "colon", "scrollback 1000\\r"])

# 3. Limpiar latest.log y debug.log in-place sin romper inodos
keywords = ["gamemode", "game mode", "survival", "creative", "spectator", "adventure", "no player was found"]
for log_path in [f"{server_dir}/logs/latest.log", f"{server_dir}/logs/debug.log"]:
    try:
        with open(log_path, "r+", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
            f.seek(0)
            cleaned = []
            for l in lines:
                l_lower = l.lower()
                is_target = player in l and any(k in l_lower for k in keywords)
                is_direct = any(f"gamemode {k}" in l_lower for k in keywords) or "no player was found" in l_lower
                if not (is_target or is_direct):
                    cleaned.append(l)
            f.writelines(cleaned)
            f.truncate()
    except Exception:
        pass

print("SUCCESS_GAMEMODE_OK")
`;

  const b64 = Buffer.from(pyCode).toString('base64');
  return new Promise((resolve) => {
    const cmd = `ssh -S ${SOCKET_PATH} ${REMOTE_USER}@${REMOTE_HOST} 'python3 -c "import base64; exec(base64.b64decode(\\"${b64}\\"))"'`;
    exec(cmd, { timeout: 18000 }, (error, stdout) => {
      if (error && !stdout) {
        return resolve({ success: false, error: error?.message || 'Error en ejecucion silenciosa' });
      }
      const ok = (stdout || '').includes('SUCCESS_GAMEMODE_OK');
      resolve({
        success: ok,
        player: safePlayer,
        mode: safeMode,
        message: ok ? `Modo ${safeMode.toUpperCase()} asignado correctamente a ${safePlayer}.` : 'Comando procesado.'
      });
    });
  });
}

module.exports = {
  fetchLiveServerData,
  executeRemoteCommand,
  wakeRemoteServer,
  listRemoteBackups,
  createRemoteBackup,
  getServerProperties,
  updateServerProperties,
  executeStealthGamemode
};
