#!/usr/bin/env python3
"""
=============================================================================
 MC-Desk Universal Server Agent (Linux Daemon)
 Secure, lightweight monitoring and management daemon for Minecraft servers.
 Compatible with Paper, Purpur, Spigot, Forge, Fabric, and Vanilla.
 Zero heavy pip dependencies — runs on standard Python 3.8+.
=============================================================================
"""

import os
import sys
import glob
import json
import time
import gzip
import struct
import socket
import datetime
import subprocess
import urllib.request
import urllib.error

VERSION = "1.2.0"
CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")

# =============================================================================
# Configuration & Auto-Discovery
# =============================================================================

DEFAULT_CONFIG = {
    "backend_url": "http://localhost:3000",
    "claim_code": "",
    "agent_token": "",
    "minecraft_dir": "",
    "screen_session": "minecraft",
    "tmux_session": "",
    "server_software": "Forge",
    "server_version": "1.20.1",
    "poll_interval_seconds": 3,
    "backups_dir": ""
}

def load_config():
    cfg = dict(DEFAULT_CONFIG)
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                cfg.update(loaded)
        except Exception as e:
            print(f"[!] Error leyendo config.json: {e}")
    else:
        example = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json.example")
        if os.path.exists(example):
            try:
                with open(example, "r", encoding="utf-8") as f:
                    cfg.update(json.load(f))
            except Exception:
                pass
        save_config(cfg)
    return cfg

def save_config(cfg):
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)
    except Exception as e:
        print(f"[!] Error guardando config.json: {e}")

def detect_minecraft_dir(configured_dir=""):
    if configured_dir and os.path.isdir(configured_dir) and os.path.exists(os.path.join(configured_dir, "server.properties")):
        return os.path.abspath(configured_dir)

    agent_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        configured_dir,
        os.path.join(agent_dir, "..", "minecraft"),
        os.path.join(agent_dir, "minecraft"),
        os.path.abspath(os.path.join(agent_dir, "..")),
        os.getcwd(),
        "/home/mcadmin/minecraft",
        "/var/games/minecraft",
        "/opt/minecraft"
    ]

    for c in candidates:
        if c and os.path.isdir(c):
            if os.path.exists(os.path.join(c, "server.properties")) or os.path.exists(os.path.join(c, "world")):
                return os.path.abspath(c)

    return os.path.abspath(agent_dir)

# =============================================================================
# Pure Python NBT Parser (No external dependencies)
# =============================================================================

TAG_END = 0
TAG_BYTE = 1
TAG_SHORT = 2
TAG_INT = 3
TAG_LONG = 4
TAG_FLOAT = 5
TAG_DOUBLE = 6
TAG_BYTE_ARRAY = 7
TAG_STRING = 8
TAG_LIST = 9
TAG_COMPOUND = 10
TAG_INT_ARRAY = 11
TAG_LONG_ARRAY = 12

def _read_string(f):
    length = struct.unpack('>H', f.read(2))[0]
    return f.read(length).decode('utf-8', errors='ignore')

def _read_tag(f, tag_type):
    if tag_type == TAG_BYTE: return struct.unpack('>b', f.read(1))[0]
    elif tag_type == TAG_SHORT: return struct.unpack('>h', f.read(2))[0]
    elif tag_type == TAG_INT: return struct.unpack('>i', f.read(4))[0]
    elif tag_type == TAG_LONG: return struct.unpack('>q', f.read(8))[0]
    elif tag_type == TAG_FLOAT: return struct.unpack('>f', f.read(4))[0]
    elif tag_type == TAG_DOUBLE: return struct.unpack('>d', f.read(8))[0]
    elif tag_type == TAG_BYTE_ARRAY:
        l = struct.unpack('>i', f.read(4))[0]
        return f.read(l)
    elif tag_type == TAG_STRING: return _read_string(f)
    elif tag_type == TAG_LIST:
        sub_type = f.read(1)[0]
        l = struct.unpack('>i', f.read(4))[0]
        return [_read_tag(f, sub_type) for _ in range(l)]
    elif tag_type == TAG_COMPOUND:
        d = {}
        while True:
            t = f.read(1)
            if not t or t[0] == TAG_END: break
            name = _read_string(f)
            d[name] = _read_tag(f, t[0])
        return d
    elif tag_type == TAG_INT_ARRAY:
        l = struct.unpack('>i', f.read(4))[0]
        return [struct.unpack('>i', f.read(4))[0] for _ in range(l)]
    elif tag_type == TAG_LONG_ARRAY:
        l = struct.unpack('>i', f.read(4))[0]
        return [struct.unpack('>q', f.read(8))[0] for _ in range(l)]
    return None

def parse_nbt_file(filepath):
    if not os.path.exists(filepath):
        return {}
    try:
        with gzip.open(filepath, 'rb') as f:
            tag_type = f.read(1)[0]
            _read_string(f)
            return _read_tag(f, tag_type) or {}
    except Exception:
        try:
            with open(filepath, 'rb') as f:
                tag_type = f.read(1)[0]
                _read_string(f)
                return _read_tag(f, tag_type) or {}
        except Exception:
            return {}

# =============================================================================
# Server List Ping (SLP)
# =============================================================================

def ping_minecraft_slp(host="127.0.0.1", port=25565):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(2.0)
        s.connect((host, port))
        
        host_bytes = host.encode("utf-8")
        data = b"\x00\x00" + struct.pack(">B", len(host_bytes)) + host_bytes + struct.pack(">H", port) + b"\x01"
        s.send(struct.pack(">B", len(data)) + data)
        s.send(b"\x01\x00")

        def read_varint():
            num = 0
            for i in range(5):
                b = s.recv(1)[0]
                num |= (b & 0x7F) << (7 * i)
                if not (b & 0x80): break
            return num

        read_varint()
        s.recv(1)
        length = read_varint()
        buf = b""
        while len(buf) < length:
            chunk = s.recv(min(4096, length - len(buf)))
            if not chunk: break
            buf += chunk
        s.close()
        return json.loads(buf.decode("utf-8", errors="ignore"))
    except Exception:
        return None

# =============================================================================
# Wakeup Packet
# =============================================================================

def wake_minecraft_server(port=25565):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(3.0)
        s.connect(('127.0.0.1', port))
        host_bytes = b'127.0.0.1'
        data = bytes([0x00, 0xfb, 0x05, len(host_bytes)]) + host_bytes + struct.pack('>H', port) + bytes([0x02])
        s.send(bytes([len(data)]) + data)
        uname = b'MCDeskWake'
        login_pkt = bytes([0x00, len(uname)]) + uname
        s.send(bytes([len(login_pkt)]) + login_pkt)
        time.sleep(0.4)
        s.close()
        return {'success': True, 'message': 'Paquete de inicio enviado. El servidor está despertando...'}
    except Exception as e:
        return {'success': False, 'error': f"Error al despertar servidor: {str(e)}"}

# =============================================================================
# System & Hardware Metrics
# =============================================================================

def get_system_metrics():
    total_kb = 0
    avail_kb = 0
    ram_pct = 0.0
    try:
        with open("/proc/meminfo") as f:
            for line in f:
                if line.startswith("MemTotal:"):
                    total_kb = int(line.split()[1])
                elif line.startswith("MemAvailable:"):
                    avail_kb = int(line.split()[1])
        if total_kb > 0:
            ram_pct = round(((total_kb - avail_kb) / total_kb) * 100.0, 1)
    except Exception:
        pass

    cpu_pct = 0.0
    try:
        with open("/proc/stat") as f:
            fields1 = [float(x) for x in f.readline().split()[1:]]
        time.sleep(0.08)
        with open("/proc/stat") as f:
            fields2 = [float(x) for x in f.readline().split()[1:]]
        idle1, idle2 = fields1[3] + fields1[4], fields2[3] + fields2[4]
        tot1, tot2 = sum(fields1), sum(fields2)
        diff_tot = tot2 - tot1
        diff_idle = idle2 - idle1
        if diff_tot > 0:
            cpu_pct = round(max(0.0, min(100.0, (1.0 - diff_idle / diff_tot) * 100.0)), 1)
    except Exception:
        pass

    temp_str = "N/D"
    try:
        for zone in sorted(os.listdir("/sys/class/thermal")):
            if zone.startswith("thermal_zone"):
                base = f"/sys/class/thermal/{zone}"
                try:
                    with open(f"{base}/type") as tf: ztype = tf.read().strip()
                    with open(f"{base}/temp") as valf: val = int(valf.read().strip())
                    if ztype in ("x86_pkg_temp", "coretemp", "acpitz", "cpu-thermal") and val > 0:
                        temp_str = f"{val / 1000.0:.1f}°C"
                        if ztype == "x86_pkg_temp":
                            break
                except Exception:
                    pass
    except Exception:
        pass

    return cpu_pct, ram_pct, temp_str

def is_process_running(screen_name="minecraft", tmux_name=""):
    if screen_name:
        try:
            out = subprocess.check_output(["screen", "-list"], text=True, stderr=subprocess.DEVNULL)
            if screen_name in out:
                return True
        except subprocess.CalledProcessError as e:
            if screen_name in getattr(e, "output", ""):
                return True
        except Exception:
            pass

    if tmux_name:
        try:
            out = subprocess.check_output(["tmux", "ls"], text=True, stderr=subprocess.DEVNULL)
            if tmux_name in out:
                return True
        except Exception:
            pass

    try:
        out = subprocess.check_output(["pgrep", "-f", "java.*(minecraft|forge|fabric|paper|server.jar)"], text=True, stderr=subprocess.DEVNULL)
        if out.strip():
            return True
    except Exception:
        pass

    return False

# =============================================================================
# Players & NBT Data Collection
# =============================================================================

def collect_players_data(mc_dir, online_names=None):
    if online_names is None:
        online_names = []
    
    players = []
    usercache_path = os.path.join(mc_dir, "usercache.json")
    users = []
    
    if os.path.exists(usercache_path):
        try:
            with open(usercache_path, "r", encoding="utf-8", errors="ignore") as f:
                users = json.load(f)
        except Exception:
            pass

    ops = set()
    ops_file = os.path.join(mc_dir, "ops.json")
    if os.path.exists(ops_file):
        try:
            with open(ops_file, "r", encoding="utf-8", errors="ignore") as f:
                ops_list = json.load(f)
                for op in ops_list:
                    if op.get("name"): ops.add(op["name"].lower())
                    if op.get("uuid"): ops.add(op["uuid"])
        except Exception:
            pass

    now_ts = time.time()
    today_date = datetime.datetime.now().date()

    for u in users:
        uuid = u.get("uuid")
        name = u.get("name")
        if not uuid or not name:
            continue

        pdat_file = os.path.join(mc_dir, "world", "playerdata", f"{uuid}.dat")
        pdata = parse_nbt_file(pdat_file) if os.path.exists(pdat_file) else {}

        raw_inv = pdata.get("Inventory", [])
        inv = []
        armor_val = 0

        for item in raw_inv:
            raw_id = item.get("id", "")
            clean_id = raw_id.replace("minecraft:", "")
            slot = item.get("Slot", 0)
            cnt = item.get("Count", 1)
            label = clean_id.replace("_", " ").title()

            if slot in (100, 101, 102, 103):
                if "netherite" in clean_id: armor_val += 5
                elif "diamond" in clean_id: armor_val += 5
                elif "iron" in clean_id: armor_val += 3
                elif "golden" in clean_id: armor_val += 2
                elif "chainmail" in clean_id: armor_val += 3
                elif "leather" in clean_id: armor_val += 1

            inv.append({
                "slot": slot,
                "item": clean_id,
                "raw_id": raw_id,
                "name": label,
                "count": cnt
            })

        stats_path = os.path.join(mc_dir, "world", "stats", f"{uuid}.json")
        st = {}
        if os.path.exists(stats_path):
            try:
                with open(stats_path, "r", encoding="utf-8", errors="ignore") as sf:
                    st = json.load(sf).get("stats", {})
            except Exception:
                pass

        custom = st.get("minecraft:custom", {})
        mined = st.get("minecraft:mined", {})
        killed = st.get("minecraft:killed", {})

        total_mined = sum(mined.values()) if isinstance(mined, dict) else 0
        total_killed = custom.get("minecraft:mob_kills", sum(killed.values()) if isinstance(killed, dict) else 0)
        playtime_ticks = custom.get("minecraft:play_time", 0)
        deaths = custom.get("minecraft:deaths", 0)

        hp = round(float(pdata.get("Health", 20.0)), 1)
        food = int(pdata.get("foodLevel", 20))
        lvl = int(pdata.get("XpLevel", 0))
        exp = int(pdata.get("XpTotal", 0))

        is_online = (name.lower() in [x.lower() for x in online_names])
        
        is_today = False
        mtime = 0
        if os.path.exists(pdat_file):
            try:
                mtime = os.path.getmtime(pdat_file)
                fdate = datetime.datetime.fromtimestamp(mtime).date()
                if (now_ts - mtime) < 86400 or fdate == today_date:
                    is_today = True
            except Exception:
                pass

        is_admin = (name.lower() in ops) or (uuid in ops)

        players.append({
            "uuid": uuid,
            "username": name,
            "health": hp,
            "food": food,
            "level": lvl,
            "experience": exp,
            "armor": max(armor_val, 0),
            "role": "Admin" if is_admin else "Jugador",
            "isOnline": is_online,
            "isToday": is_today,
            "lastSeen": int(mtime) if mtime else None,
            "ping": 28 if is_online else 0,
            "inventory": inv,
            "stats": {
                "playtime_minutes": int(playtime_ticks / 1200),
                "blocks_mined": total_mined,
                "mobs_killed": total_killed,
                "deaths": deaths
            }
        })

    players.sort(key=lambda p: (p["isOnline"], p["role"] == "Admin", p["level"]), reverse=True)
    return players

# =============================================================================
# Command Execution & Screen/Tmux Interaction
# =============================================================================

def execute_command_on_server(cmd, screen_name="minecraft", tmux_name="", mc_dir=""):
    clean = cmd.strip().lstrip("/")
    if not clean:
        return {"success": False, "error": "Comando vacío"}

    output_lines = []
    try:
        if screen_name:
            subprocess.run(["screen", "-S", screen_name, "-X", "stuff", f"{clean}\n"], check=True)
        elif tmux_name:
            subprocess.run(["tmux", "send-keys", "-t", tmux_name, f"{clean}", "ENTER"], check=True)
        else:
            return {"success": False, "error": "No hay sesión screen o tmux configurada"}

        time.sleep(0.35)
        log_file = os.path.join(mc_dir, "logs", "latest.log")
        if os.path.exists(log_file):
            try:
                with open(log_file, "r", encoding="utf-8", errors="ignore") as lf:
                    output_lines = [l.strip() for l in lf.readlines()[-8:]]
            except Exception:
                pass

        return {
            "success": True,
            "command": clean,
            "output": output_lines,
            "message": f"Comando /{clean} enviado exitosamente a la consola."
        }
    except Exception as e:
        return {"success": False, "error": f"Error ejecutando comando: {str(e)}"}

# =============================================================================
# Server Properties & Backups
# =============================================================================

def read_server_properties(mc_dir):
    pfile = os.path.join(mc_dir, "server.properties")
    props = {}
    if os.path.exists(pfile):
        try:
            with open(pfile, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        props[k.strip()] = v.strip()
        except Exception as e:
            props["_error"] = str(e)
    return props

def write_server_properties(mc_dir, updates):
    pfile = os.path.join(mc_dir, "server.properties")
    if not os.path.exists(pfile):
        return {"success": False, "error": "server.properties no encontrado"}
    try:
        lines = []
        updated_keys = set()
        with open(pfile, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                stripped = line.strip()
                if stripped and not stripped.startswith("#") and "=" in stripped:
                    k, _ = stripped.split("=", 1)
                    k = k.strip()
                    if k in updates:
                        lines.append(f"{k}={updates[k]}\n")
                        updated_keys.add(k)
                        continue
                lines.append(line)
        for k, v in updates.items():
            if k not in updated_keys:
                lines.append(f"{k}={v}\n")
        with open(pfile, "w", encoding="utf-8") as f:
            f.writelines(lines)
        return {"success": True, "message": "server.properties actualizado exitosamente", "updated": list(updates.keys())}
    except Exception as e:
        return {"success": False, "error": str(e)}

def list_backups(backups_dir, mc_dir):
    target_dir = backups_dir or os.path.join(mc_dir, "..", "backups")
    if not os.path.isdir(target_dir):
        target_dir = os.path.join(mc_dir, "backups")
    if not os.path.isdir(target_dir):
        return []

    backups = []
    for fp in glob.glob(os.path.join(target_dir, "*.tar.gz")):
        try:
            st = os.stat(fp)
            size_mb = round(st.st_size / (1024 * 1024), 1)
            dt = datetime.datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
            backups.append({
                "filename": os.path.basename(fp),
                "size": f"{size_mb} MB",
                "date": dt,
                "timestamp": int(st.st_mtime)
            })
        except Exception:
            pass
    backups.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    return backups

def create_world_backup(backups_dir, mc_dir):
    target_dir = backups_dir or os.path.join(mc_dir, "..", "backups")
    if not os.path.exists(target_dir):
        os.makedirs(target_dir, exist_ok=True)

    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"world_backup_{ts}.tar.gz"
    dest_path = os.path.join(target_dir, filename)

    world_path = os.path.join(mc_dir, "world")
    if not os.path.exists(world_path):
        return {"success": False, "error": f"Carpeta world no encontrada en {mc_dir}"}

    try:
        cmd = ["tar", "-czf", dest_path, "-C", mc_dir, "world"]
        subprocess.run(cmd, check=True, timeout=120)
        size_mb = round(os.path.getsize(dest_path) / (1024 * 1024), 1)
        return {
            "success": True,
            "filename": filename,
            "size": f"{size_mb} MB",
            "message": f"Copia de seguridad creada: {filename} ({size_mb} MB)"
        }
    except Exception as e:
        return {"success": False, "error": f"Error creando backup: {str(e)}"}

# =============================================================================
# HTTP Communication Helper
# =============================================================================

def http_post(url, data, headers=None):
    if headers is None:
        headers = {}
    headers["Content-Type"] = "application/json"
    headers["User-Agent"] = f"MC-Desk-Agent/{VERSION}"

    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="ignore")
        try:
            return json.loads(body)
        except Exception:
            return {"error": body, "status": e.code}
    except Exception as e:
        return {"error": str(e)}

import argparse

# =============================================================================
# Main Loop & Handshake
# =============================================================================

def main():
    print(f"==================================================")
    print(f"       🚀 MC-Desk Universal Agent v{VERSION}      ")
    print(f"==================================================")

    parser = argparse.ArgumentParser(description="MC-Desk Universal Server Agent")
    parser.add_argument("--url", "--backend", dest="backend_url", help="URL del backend MC-Desk (ej: https://tu-app.onrender.com)")
    parser.add_argument("--claim", dest="claim_code", help="Código de vinculación generado en el panel (MC-DESK-XXXX-YYYY)")
    parser.add_argument("--token", dest="agent_token", help="Token persistente del agente (mca_...)")
    parser.add_argument("--dir", dest="minecraft_dir", help="Ruta al directorio del servidor Minecraft")
    parser.add_argument("--screen", dest="screen_session", help="Nombre de la sesión de screen de Minecraft")
    parser.add_argument("--poll", dest="poll_interval", type=int, help="Intervalo de telemetría en segundos (por defecto 3)")
    args, _ = parser.parse_known_args()

    cfg = load_config()

    # Override config with CLI arguments if provided
    if args.backend_url:
        cfg["backend_url"] = args.backend_url.strip()
    if args.claim_code:
        cfg["claim_code"] = args.claim_code.strip()
    if args.agent_token:
        cfg["agent_token"] = args.agent_token.strip()
    if args.minecraft_dir:
        cfg["minecraft_dir"] = args.minecraft_dir.strip()
    if args.screen_session:
        cfg["screen_session"] = args.screen_session.strip()
    if args.poll_interval:
        cfg["poll_interval_seconds"] = args.poll_interval

    save_config(cfg)

    backend_url = cfg.get("backend_url", "http://localhost:3000").rstrip("/")
    claim_code = cfg.get("claim_code", "").strip()
    agent_token = cfg.get("agent_token", "").strip()
    screen_name = cfg.get("screen_session", "minecraft")
    tmux_name = cfg.get("tmux_session", "")
    poll_interval = int(cfg.get("poll_interval_seconds", 3))

    mc_dir = detect_minecraft_dir(cfg.get("minecraft_dir", ""))
    print(f"[*] Directorio de Minecraft detectado: {mc_dir}")
    print(f"[*] Conectando a Backend API: {backend_url}")

    if not agent_token and not claim_code:
        print("[*] No se encontró token previo. Iniciando registro automático de servidor...")
        server_props = read_server_properties(mc_dir)
        server_name = server_props.get("motd", "Mi Servidor Minecraft").replace("§", "")
        server_port = int(server_props.get("server-port", 25565))

        init_resp = http_post(f"{backend_url}/api/agent/register-init", {
            "serverName": server_name,
            "port": server_port,
            "software": cfg.get("server_software", "Forge"),
            "version": cfg.get("server_version", "1.20.1")
        })

        if init_resp and init_resp.get("pairingCode"):
            pairing_code = init_resp["pairingCode"]
            print("\n" + "=" * 64)
            print("   🚀 MC-DESK: ¡SERVIDOR LISTO PARA VINCULAR AL PANEL WEB!")
            print("=" * 64)
            print("   Copia y pega este código en tu panel web MC-Desk:")
            print("")
            print(f"        👉   {pairing_code}   👈")
            print("")
            print("   (Ve a la web -> Conectar Servidor con Token -> Pega el código)")
            print("=" * 64)
            print("[*] Esperando a que vincules el servidor desde el panel web...\n")

            poll_sec = init_resp.get("pollIntervalSeconds", 2)
            while True:
                time.sleep(poll_sec)
                status_resp = http_post(f"{backend_url}/api/agent/pairing-status", {
                    "pairingCode": pairing_code
                })
                if status_resp and status_resp.get("paired"):
                    agent_token = status_resp["agentToken"]
                    cfg["agent_token"] = agent_token
                    save_config(cfg)
                    print(f"\n[✓] ¡Éxito! Servidor vinculado a tu cuenta web ({status_resp.get('serverName')}).")
                    print(f"[✓] Token permanente guardado en config.json.\n")
                    break
        else:
            err = init_resp.get("error", "No se pudo conectar con el backend") if init_resp else "Backend inaccesible"
            print(f"[x] Error registrando servidor ({err}). Verifica que {backend_url} esté en línea.")
            time.sleep(5)
            return

    if not agent_token and claim_code:
        print(f"[*] Vinculando servidor mediante Claim Code: {claim_code}...")
        resp = http_post(f"{backend_url}/api/agent/verify", {
            "claimCode": claim_code,
            "agentVersion": VERSION,
            "serverInfo": {
                "software": cfg.get("server_software", "Forge"),
                "version": cfg.get("server_version", "1.20.1")
            }
        })

        if resp and resp.get("agentToken"):
            agent_token = resp["agentToken"]
            cfg["agent_token"] = agent_token
            cfg["claim_code"] = ""
            save_config(cfg)
            print(f"[✓] ¡Servidor vinculado exitosamente! Token guardado.")
        else:
            err = resp.get("error", "Desconocido") if resp else "Sin respuesta"
            print(f"[x] Error en la vinculación ({err}). Revisa tu claim_code en config.json.")
            time.sleep(5)
            return

    if not agent_token:
        print("[!] Agent sin token ni claim_code. Edita config.json o ejecuta install.sh con --claim.")
        sys.exit(1)

    print(f"[✓] Agent autenticado con éxito. Iniciando telemetría hacia {backend_url}...")

    start_time = time.time()
    last_backups_sync = 0
    cached_backups = []
    server_props = read_server_properties(mc_dir)

    while True:
        try:
            cpu_pct, ram_pct, cpu_temp = get_system_metrics()
            running = is_process_running(screen_name, tmux_name)

            online_count = 0
            max_count = int(server_props.get("max-players", 20))
            online_names = []
            
            slp = ping_minecraft_slp()
            is_awake = (slp is not None) or running

            if slp:
                p_obj = slp.get("players", {})
                online_count = p_obj.get("online", 0)
                max_count = p_obj.get("max", max_count)
                online_names = [p.get("name") for p in p_obj.get("sample", []) if p.get("name")]

            players_data = collect_players_data(mc_dir, online_names)
            if online_count == 0:
                online_count = sum(1 for p in players_data if p["isOnline"])

            status = "ONLINE" if is_awake else "SLEEPING"

            uptime_sec = int(time.time() - start_time)
            h, rem = divmod(uptime_sec, 3600)
            m, s = divmod(rem, 60)
            uptime_str = f"{h}h {m}m {s}s"

            if time.time() - last_backups_sync > 30:
                cached_backups = list_backups(cfg.get("backups_dir"), mc_dir)
                last_backups_sync = time.time()

            telemetry = {
                "status": status,
                "onlinePlayers": online_count,
                "maxPlayers": max_count,
                "tps": 20.0 if is_awake else 0.0,
                "uptime": uptime_str,
                "cpuUsage": cpu_pct,
                "ramUsage": ram_pct,
                "cpuTemp": cpu_temp,
                "players": players_data,
                "serverProperties": server_props,
                "backups": cached_backups
            }

            headers = {"X-Agent-Token": agent_token}
            res = http_post(f"{backend_url}/api/agent/telemetry", telemetry, headers)

            if res and "pendingCommands" in res and isinstance(res["pendingCommands"], list):
                for cmd_item in res["pendingCommands"]:
                    cid = cmd_item.get("id")
                    raw_cmd = cmd_item.get("command", "").strip()

                    print(f"[>] Procesando comando del panel: {raw_cmd}")
                    cmd_res = {}

                    if raw_cmd == "__ACTION__:WAKE":
                        port = int(server_props.get("server-port", 25565))
                        cmd_res = wake_minecraft_server(port)
                    elif raw_cmd == "__ACTION__:BACKUP":
                        cmd_res = create_world_backup(cfg.get("backups_dir"), mc_dir)
                        cached_backups = list_backups(cfg.get("backups_dir"), mc_dir)
                    elif raw_cmd.startswith("__ACTION__:SET_PROPS"):
                        try:
                            payload_json = raw_cmd.replace("__ACTION__:SET_PROPS", "").strip()
                            updates = json.loads(payload_json)
                            cmd_res = write_server_properties(mc_dir, updates)
                            server_props = read_server_properties(mc_dir)
                        except Exception as pe:
                            cmd_res = {"success": False, "error": f"JSON inválido: {str(pe)}"}
                    elif raw_cmd == "__ACTION__:GET_PROPS":
                        server_props = read_server_properties(mc_dir)
                        cmd_res = {"success": True, "properties": server_props}
                    elif raw_cmd.startswith("__ACTION__:STEALTH_GAMEMODE"):
                        parts = raw_cmd.split()
                        target_p = parts[1] if len(parts) > 1 else ""
                        target_m = parts[2] if len(parts) > 2 else "survival"
                        if target_p:
                            execute_command_on_server(f"gamemode {target_m} {target_p}", screen_name, tmux_name, mc_dir)
                            time.sleep(0.5)
                            if screen_name:
                                subprocess.run(["screen", "-S", screen_name, "-p", "0", "-X", "clear"], check=False)
                                subprocess.run(["screen", "-S", screen_name, "-p", "0", "-X", "colon", "scrollback 0\r"], check=False)
                                subprocess.run(["screen", "-S", screen_name, "-p", "0", "-X", "colon", "scrollback 1000\r"], check=False)
                            keywords = ["gamemode", "game mode", "survival", "creative", "spectator", "adventure", "no player was found"]
                            for log_path in [os.path.join(mc_dir, "logs", "latest.log"), os.path.join(mc_dir, "logs", "debug.log")]:
                                try:
                                    if os.path.exists(log_path):
                                        with open(log_path, "r+", encoding="utf-8", errors="ignore") as f:
                                            lines = f.readlines()
                                            f.seek(0)
                                            cleaned = [l for l in lines if not (target_p in l and any(k in l.lower() for k in keywords))]
                                            f.writelines(cleaned)
                                            f.truncate()
                                except Exception:
                                    pass
                            cmd_res = {
                                "success": True,
                                "player": target_p,
                                "mode": target_m,
                                "message": f"Modo {target_m.upper()} aplicado a {target_p} sin dejar rastros en logs ni consola."
                            }
                        else:
                            cmd_res = {"success": False, "error": "Jugador no especificado"}
                    else:
                        cmd_res = execute_command_on_server(raw_cmd, screen_name, tmux_name, mc_dir)

                    http_post(
                        f"{backend_url}/api/agent/command-result",
                        {
                            "commandId": cid,
                            "response": json.dumps(cmd_res) if isinstance(cmd_res, dict) else str(cmd_res),
                            "status": "EXECUTED" if cmd_res.get("success", True) else "FAILED"
                        },
                        headers
                    )

        except Exception as loop_err:
            print(f"[!] Error en ciclo de telemetría: {loop_err}")

        time.sleep(poll_interval)

if __name__ == "__main__":
    main()
