#!/usr/bin/env python3
import os
import subprocess
import time
import socket
import struct
import json
import datetime

STATE_FILE = "/tmp/mc_idle_minutes"
IDLE_THRESHOLD = 35

def get_sys_metrics():
    total_kb = 0
    avail_kb = 0
    used_kb = 0
    ram_pct = 0.0
    try:
        with open("/proc/meminfo") as f:
            lines = dict(line.split(":", 1) for line in f if ":" in line)
        total_kb = int(lines.get("MemTotal", "0").split()[0])
        avail_kb = int(lines.get("MemAvailable", "0").split()[0])
        used_kb = total_kb - avail_kb
        if total_kb > 0:
            ram_pct = (used_kb / total_kb) * 100.0
    except Exception:
        pass

    cpu_pct = 0.0
    try:
        with open("/proc/stat") as f:
            fields1 = [float(x) for x in f.readline().split()[1:]]
        time.sleep(0.12)
        with open("/proc/stat") as f:
            fields2 = [float(x) for x in f.readline().split()[1:]]
        idle1, idle2 = fields1[3] + fields1[4], fields2[3] + fields2[4]
        tot1, tot2 = sum(fields1), sum(fields2)
        diff_tot = tot2 - tot1
        diff_idle = idle2 - idle1
        if diff_tot > 0:
            cpu_pct = max(0.0, min(100.0, (1.0 - diff_idle / diff_tot) * 100.0))
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
                    if ztype in ("x86_pkg_temp", "coretemp", "acpitz") and val > 0:
                        temp_str = f"{val / 1000.0:.1f}°C"
                        if ztype == "x86_pkg_temp":
                            break
                except Exception:
                    pass
    except Exception:
        pass

    return {
        "cpu_pct": cpu_pct,
        "ram_pct": ram_pct,
        "ram_used_mb": used_kb // 1024,
        "ram_total_mb": total_kb // 1024,
        "cpu_temp": temp_str
    }

def is_minecraft_running():
    try:
        out = subprocess.check_output(["screen", "-list"], text=True, stderr=subprocess.DEVNULL)
        return "minecraft" in out
    except subprocess.CalledProcessError as e:
        return "minecraft" in getattr(e, "output", "")
    except Exception:
        return False

def get_minecraft_proc_usage():
    try:
        out = subprocess.check_output(["ps", "-C", "java", "-o", "%cpu,%mem"], text=True, stderr=subprocess.DEVNULL)
        lines = [line.strip() for line in out.splitlines() if line.strip() and not line.strip().startswith("%")]
        if lines:
            parts = lines[0].split()
            return parts[0] + "%", parts[1] + "%"
    except Exception:
        pass
    return "N/D", "N/D"

def get_idle_minutes():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                return int(f.read().strip())
        except Exception:
            return 0
    return 0

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

def get_players_today():
    usercache_file = "/home/mcadmin/minecraft/usercache.json"
    playerdata_dir = "/home/mcadmin/minecraft/world/playerdata"

    uuid_to_name = {}
    if os.path.exists(usercache_file):
        try:
            with open(usercache_file, "r") as f:
                for entry in json.load(f):
                    uuid_to_name[entry.get("uuid")] = entry.get("name")
        except Exception:
            pass

    now = time.time()
    today_date = datetime.datetime.now().date()
    today_players = []

    if os.path.exists(playerdata_dir):
        for fname in os.listdir(playerdata_dir):
            if fname.endswith(".dat"):
                uuid = fname[:-4]
                fpath = os.path.join(playerdata_dir, fname)
                try:
                    mtime = os.path.getmtime(fpath)
                    fdate = datetime.datetime.fromtimestamp(mtime).date()
                    # Active within last 24h OR same calendar day
                    if (now - mtime) < 86400 or fdate == today_date:
                        name = uuid_to_name.get(uuid, uuid[:8])
                        today_players.append((name, mtime))
                except Exception:
                    pass

    # Sort most recent first
    today_players.sort(key=lambda x: x[1], reverse=True)
    return [p[0] for p in today_players]

def is_chunky_running():
    try:
        capture_file = "/tmp/screen_chunky_check.txt"
        subprocess.run(["screen", "-S", "minecraft", "-X", "hardcopy", capture_file], check=False)
        time.sleep(0.2)
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

def main():
    m = get_sys_metrics()
    running = is_minecraft_running()
    today_players = get_players_today()
    today_count = len(today_players)
    today_str = ", ".join(today_players) if today_players else "Ninguno registrado hoy"

    print("==================================================")
    print("           ESTADO DEL SERVIDOR MINECRAFT          ")
    print("==================================================")
    
    if running:
        mc_cpu, mc_ram = get_minecraft_proc_usage()
        print(" Estado           : \033[1;32mACTIVO / EN EJECUCION\033[0m")
        print(f" Proceso Java MC  : CPU {mc_cpu} | RAM {mc_ram}")
        
        slp = ping_minecraft_slp()
        online_now = 0
        max_players = 10
        player_names = []
        
        if slp:
            online_now = slp.get("online", 0)
            max_players = slp.get("max", 10)
            player_names = [p.get("name") for p in slp.get("sample", []) if p.get("name")]
        
        if online_now > 0:
            names_txt = f" ({', '.join(player_names)})" if player_names else ""
            print(f" Conectados ahora : \033[1;32m{online_now} / {max_players} jugadores{names_txt}\033[0m")
            print(" Tiempo p/ cierre : \033[36mCancelado (hay jugadores activos en linea)\033[0m")
        else:
            idle = get_idle_minutes()
            rem = max(0, IDLE_THRESHOLD - idle)
            print(f" Conectados ahora : \033[1;33m0 / {max_players} jugadores (Servidor vacio)\033[0m")
            
            if is_chunky_running():
                print(" Tiempo p/ cierre : \033[36mEn pausa (Chunky esta precargando chunks)\033[0m")
            elif rem <= 1:
                print(f" Tiempo p/ cierre : \033[1;31m¡Menos de 1 min! Apagando en breve ({idle}/{IDLE_THRESHOLD} min)\033[0m")
            else:
                print(f" Tiempo p/ cierre : \033[1;33mFaltan {rem} minutos (inactivo {idle}/{IDLE_THRESHOLD} min)\033[0m")
    else:
        print(" Estado           : \033[1;33mEN REPOSO / APAGADO (Sleeping Server)\033[0m")
        print(" Conectados ahora : 0 jugadores")
        print(" Tiempo p/ cierre : \033[37mN/A (Ya se encuentra en reposo)\033[0m")

    print(f" Jugadores hoy    : \033[1;36m{today_count} jugador(es)\033[0m ({today_str})")
    print("--------------------------------------------------")
    print(f" Uso de CPU Total : {m['cpu_pct']:.1f}%")
    print(f" Temp. del CPU    : {m['cpu_temp']}")
    print(f" Uso de RAM Total : {m['ram_pct']:.1f}% ({m['ram_used_mb']} MB / {m['ram_total_mb']} MB)")
    print("--------------------------------------------------")
    
    try:
        out = subprocess.check_output(["ss", "-tlpn"], text=True, stderr=subprocess.DEVNULL)
        if ":25565" in out:
            if running:
                print(" Puerto 25565     : \033[32mABIERTO (Atendiendo Minecraft)\033[0m")
            else:
                print(" Puerto 25565     : \033[36mESCUCHANDO (MCSleepingServerStarter)\033[0m")
        else:
            print(" Puerto 25565     : \033[31mCERRADO o inicializando...\033[0m")
    except Exception:
        pass
    print("==================================================")

if __name__ == "__main__":
    main()
