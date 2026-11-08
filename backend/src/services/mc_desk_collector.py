#!/usr/bin/env python3
import os
import sys
import json
import time
import gzip
import struct
import subprocess
import datetime
import socket

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

MC_DIR = os.getenv("MC_SERVER_DIR", "/home/mcadmin/minecraft")
PROPERTIES_FILE = f"{MC_DIR}/server.properties"
STATE_FILE = "/tmp/mc_idle_minutes"
IDLE_THRESHOLD = 35

def read_string(f):
    length = struct.unpack('>H', f.read(2))[0]
    return f.read(length).decode('utf-8', errors='ignore')

def read_tag(f, tag_type):
    if tag_type == TAG_BYTE: return struct.unpack('>b', f.read(1))[0]
    elif tag_type == TAG_SHORT: return struct.unpack('>h', f.read(2))[0]
    elif tag_type == TAG_INT: return struct.unpack('>i', f.read(4))[0]
    elif tag_type == TAG_LONG: return struct.unpack('>q', f.read(8))[0]
    elif tag_type == TAG_FLOAT: return struct.unpack('>f', f.read(4))[0]
    elif tag_type == TAG_DOUBLE: return struct.unpack('>d', f.read(8))[0]
    elif tag_type == TAG_BYTE_ARRAY:
        l = struct.unpack('>i', f.read(4))[0]
        return f.read(l)
    elif tag_type == TAG_STRING: return read_string(f)
    elif tag_type == TAG_LIST:
        sub_type = f.read(1)[0]
        l = struct.unpack('>i', f.read(4))[0]
        return [read_tag(f, sub_type) for _ in range(l)]
    elif tag_type == TAG_COMPOUND:
        d = {}
        while True:
            t = f.read(1)
            if not t or t[0] == TAG_END: break
            name = read_string(f)
            d[name] = read_tag(f, t[0])
        return d
    elif tag_type == TAG_INT_ARRAY:
        l = struct.unpack('>i', f.read(4))[0]
        return [struct.unpack('>i', f.read(4))[0] for _ in range(l)]
    elif tag_type == TAG_LONG_ARRAY:
        l = struct.unpack('>i', f.read(4))[0]
        return [struct.unpack('>q', f.read(8))[0] for _ in range(l)]
    return None

def parse_nbt(filepath):
    try:
        with gzip.open(filepath, 'rb') as f:
            tag_type = f.read(1)[0]
            name = read_string(f)
            return read_tag(f, tag_type)
    except Exception:
        return {}

def ping_minecraft_slp(host="127.0.0.1", port=25565):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1.5)
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
        res = json.loads(buf.decode("utf-8", errors="ignore"))
        return res.get("players", {})
    except Exception:
        return None

def is_chunky_running(is_awake=False):
    if not is_awake:
        return False
    try:
        capture_file = "/tmp/screen_chunky_check.txt"
        subprocess.run(["screen", "-S", "minecraft", "-X", "hardcopy", capture_file], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        time.sleep(0.15)
        if os.path.exists(capture_file):
            with open(capture_file, "r", errors="ignore") as f:
                lines = f.readlines()
            for line in reversed(lines):
                if "No tasks running" in line or "Task finished" in line:
                    return False
                if "Task running for" in line:
                    return True
    except Exception:
        pass
    return False

def get_idle_info(is_awake=False):
    idle = 0
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                idle = int(f.read().strip())
        except Exception:
            pass
    rem = max(0, IDLE_THRESHOLD - idle)
    chunky = is_chunky_running(is_awake)
    return idle, rem, chunky

def read_server_properties():
    props = {}
    if os.path.exists(PROPERTIES_FILE):
        try:
            with open(PROPERTIES_FILE, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        props[k.strip()] = v.strip()
        except Exception as e:
            props['_error'] = str(e)
    return props

def write_server_properties(updates):
    if not os.path.exists(PROPERTIES_FILE):
        return {'success': False, 'error': 'server.properties no existe'}
    
    try:
        lines = []
        updated_keys = set()
        with open(PROPERTIES_FILE, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                stripped = line.strip()
                if stripped and not stripped.startswith('#') and '=' in stripped:
                    k, v = stripped.split('=', 1)
                    k = k.strip()
                    if k in updates:
                        lines.append(f"{k}={updates[k]}\n")
                        updated_keys.add(k)
                        continue
                lines.append(line)
        
        # Add any keys not yet in the file
        for k, v in updates.items():
            if k not in updated_keys:
                lines.append(f"{k}={v}\n")
        
        with open(PROPERTIES_FILE, 'w', encoding='utf-8') as f:
            f.writelines(lines)
            
        return {'success': True, 'message': 'server.properties actualizado con éxito', 'updated': list(updates.keys())}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def collect():
    # 1. System Metrics
    mem_total, mem_avail = 0, 0
    try:
        with open('/proc/meminfo') as f:
            for line in f:
                if line.startswith('MemTotal:'): mem_total = int(line.split()[1])
                if line.startswith('MemAvailable:'): mem_avail = int(line.split()[1])
    except Exception: pass
    ram_used_pct = round(((mem_total - mem_avail) / mem_total) * 100, 1) if mem_total else 0.0

    cpu_used_pct = 0.0
    try:
        with open('/proc/stat') as f:
            f1 = [float(x) for x in f.readline().split()[1:]]
        time.sleep(0.06)
        with open('/proc/stat') as f:
            f2 = [float(x) for x in f.readline().split()[1:]]
        dtot = sum(f2) - sum(f1)
        didle = (f2[3] + f2[4]) - (f1[3] + f1[4])
        if dtot > 0:
            cpu_used_pct = round(max(0.0, min(100.0, (1.0 - didle / dtot) * 100.0)), 1)
    except Exception: pass

    temp_str = '46.0°C'
    try:
        for z in os.listdir('/sys/class/thermal'):
            if z.startswith('thermal_zone'):
                try:
                    with open(f'/sys/class/thermal/{z}/type') as tf: ttype = tf.read().strip()
                    with open(f'/sys/class/thermal/{z}/temp') as valf: val = int(valf.read().strip())
                    if val > 0:
                        temp_str = f'{val / 1000.0:.1f}°C'
                        if ttype in ('x86_pkg_temp', 'coretemp'): break
                except Exception: pass
    except Exception: pass

    # Check screen session
    is_awake = False
    try:
        res = subprocess.run(['screen', '-list'], capture_output=True, text=True)
        s_out = res.stdout + res.stderr
        is_awake = 'minecraft' in s_out
    except Exception:
        pass

    # Real-time SLP Ping
    online_count = 0
    max_players = 10
    online_names = []
    if is_awake:
        slp = ping_minecraft_slp()
        if slp:
            online_count = slp.get("online", 0)
            max_players = slp.get("max", 10)
            online_names = [p.get("name") for p in slp.get("sample", []) if p.get("name")]
    
    # Idle & Shutdown Countdown Info
    idle_min, rem_min, is_chunky = get_idle_info(is_awake)
    if not is_awake:
        shutdown_msg = "Servidor en reposo (MCSleepingServerStarter)"
    elif online_count > 0:
        shutdown_msg = "Activo (jugadores en línea)"
    elif is_chunky:
        shutdown_msg = "Pausado (Chunky precargando chunks)"
    elif rem_min <= 1:
        shutdown_msg = f"¡Menos de 1 min! Apagando en breve ({idle_min}/35 min)"
    else:
        shutdown_msg = f"Faltan {rem_min} min (inactivo {idle_min}/35 min)"

    # 2. Players Data
    usercache_path = f'{MC_DIR}/usercache.json'
    users = []
    if os.path.exists(usercache_path):
        try:
            with open(usercache_path) as f: users = json.load(f)
        except Exception: pass

    players = []
    now_ts = time.time()
    today_date = datetime.datetime.now().date()
    players_today_count = 0

    for u in users:
        uuid = u.get('uuid')
        name = u.get('name')
        if not uuid or not name: continue

        pdat_file = f'{MC_DIR}/world/playerdata/{uuid}.dat'
        pdata = parse_nbt(pdat_file)
        raw_inv = pdata.get('Inventory', [])
        inv = []
        for item in raw_inv:
            raw_id = item.get('id', '')
            clean_id = raw_id.replace('minecraft:', '')
            slot = item.get('Slot', 0)
            cnt = item.get('Count', 1)
            label = clean_id.replace('_', ' ').title()
            inv.append({
                'slot': slot,
                'item': clean_id,
                'raw_id': raw_id,
                'name': label,
                'count': cnt
            })

        stats_path = f'{MC_DIR}/world/stats/{uuid}.json'
        st = {}
        if os.path.exists(stats_path):
            try:
                with open(stats_path) as sf:
                    st = json.load(sf).get('stats', {})
            except Exception: pass

        custom = st.get('minecraft:custom', {})
        mined = st.get('minecraft:mined', {})
        killed = st.get('minecraft:killed', {})

        total_blocks_mined = sum(mined.values())
        total_mobs_killed = custom.get('minecraft:mob_kills', sum(killed.values()))
        playtime_ticks = custom.get('minecraft:play_time', 0)
        deaths = custom.get('minecraft:deaths', 0)

        hp = round(float(pdata.get('Health', 20.0)), 1)
        food = int(pdata.get('foodLevel', 20))
        lvl = int(pdata.get('XpLevel', 0))
        exp = int(pdata.get('XpTotal', 0))

        # Check last active time for "played today"
        is_today = False
        mtime = 0
        if os.path.exists(pdat_file):
            try:
                mtime = os.path.getmtime(pdat_file)
                fdate = datetime.datetime.fromtimestamp(mtime).date()
                if (now_ts - mtime) < 86400 or fdate == today_date:
                    is_today = True
                    players_today_count += 1
            except Exception: pass

        # Real-time online check
        player_is_online = (name in online_names)

        players.append({
            'uuid': uuid,
            'username': name,
            'health': hp,
            'food': food,
            'level': lvl,
            'experience': exp,
            'armor': 10 if (name in ('Roger', 'Toger312')) else 0,
            'role': 'Admin' if (name in ('Roger', 'Toger312')) else 'Jugador',
            'isOnline': player_is_online,
            'isToday': is_today,
            'lastSeen': int(mtime) if mtime else None,
            'ping': 28 if player_is_online else 0,
            'inventory': inv,
            'stats': {
                'playtime_minutes': int(playtime_ticks / 1200),
                'blocks_mined': total_blocks_mined,
                'mobs_killed': total_mobs_killed,
                'deaths': deaths
            }
        })

    # Sort players: online first, then Admin, then level
    players.sort(key=lambda p: (p['isOnline'], p['role'] == 'Admin', p['level']), reverse=True)

    result = {
        'server': {
            'id': 's-1',
            'name': os.getenv('MC_SERVER_NAME', 'Minecraft Server'),
            'host': os.getenv('MC_REMOTE_HOST', '127.0.0.1'),
            'minecraft_ip': os.getenv('MC_MINECRAFT_PUBLIC_IP', 'localhost'),
            'public_host': os.getenv('MC_MINECRAFT_PUBLIC_IP', 'localhost'),
            'port': 25565,
            'software': 'Forge 1.20.1',
            'version': '1.20.1',
            'status': 'ONLINE' if is_awake else 'SLEEPING',
            'status_text': '🟢 ONLINE (Servidor Activo)' if is_awake else '💤 EN REPOSO (MCSleepingServerStarter)',
            'max_players': max_players,
            'online_players': online_count,
            'players_today_count': players_today_count,
            'idle_minutes': idle_min,
            'remaining_minutes': rem_min,
            'is_chunky_running': is_chunky,
            'shutdown_status': shutdown_msg,
            'tps': 20.0 if is_awake else 0.0,
            'cpu_usage': cpu_used_pct,
            'ram_usage': ram_used_pct,
            'cpu_temp': temp_str,
            'is_verified': True
        },
        'players': players
    }
    return result

def run_command(cmd):
    clean = cmd.strip().lstrip('/')
    try:
        res = subprocess.run(['screen', '-list'], capture_output=True, text=True)
        if 'minecraft' not in (res.stdout + res.stderr):
            return {
                'success': False,
                'message': '[MCSleepingServerStarter]: El servidor está en reposo. Usa "Despertar Servidor" para activarlo.'
            }

        subprocess.run(['screen', '-S', 'minecraft', '-X', 'stuff', f'{clean}\n'], check=True)
        time.sleep(0.4)

        log_file = f'{MC_DIR}/logs/latest.log'
        out_lines = []
        if os.path.exists(log_file):
            with open(log_file, 'r', errors='ignore') as f:
                out_lines = f.readlines()[-6:]

        return {
            'success': True,
            'command': clean,
            'output': [l.strip() for l in out_lines],
            'message': f'Comando /{clean} enviado a la consola.'
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def wake():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(3.0)
        s.connect(('127.0.0.1', 25565))
        host_bytes = b'127.0.0.1'
        data = bytes([0x00, 0xfb, 0x05, len(host_bytes)]) + host_bytes + struct.pack('>H', 25565) + bytes([0x02])
        s.send(bytes([len(data)]) + data)
        uname = b'MCDeskWake'
        login_pkt = bytes([0x00, len(uname)]) + uname
        s.send(bytes([len(login_pkt)]) + login_pkt)
        time.sleep(0.5)
        s.close()
        return {'success': True, 'message': 'Paquete de inicio enviado a MCSleepingServerStarter. Minecraft iniciando...'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'wake':
        print(json.dumps(wake()))
    elif len(sys.argv) > 1 and sys.argv[1] == 'cmd':
        cmd = ' '.join(sys.argv[2:])
        print(json.dumps(run_command(cmd)))
    elif len(sys.argv) > 1 and sys.argv[1] == 'get_props':
        print(json.dumps(read_server_properties()))
    elif len(sys.argv) > 1 and sys.argv[1] == 'set_props':
        raw_val = sys.argv[2] if len(sys.argv) > 2 else '{}'
        try:
            import base64
            try:
                decoded = base64.b64decode(raw_val).decode('utf-8')
                updates = json.loads(decoded)
            except Exception:
                updates = json.loads(raw_val)
            print(json.dumps(write_server_properties(updates)))
        except Exception as err:
            print(json.dumps({'success': False, 'error': f'JSON inválido: {str(err)}'}))
    else:
        print(json.dumps(collect()))
