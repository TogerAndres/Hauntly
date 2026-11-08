#!/usr/bin/env python3
import os
import subprocess
import time
import socket
import struct
import json
import re
import urllib.request

def get_color(latency_ms):
    if latency_ms is None:
        return "\033[1;31mFALLO\033[0m", "\033[1;31m[ 🔴 SIN RESPUESTA ]\033[0m"
    if latency_ms < 20:
        return f"\033[1;32m{latency_ms:.1f} ms\033[0m", "\033[1;32m[ 🟢 EXCELENTE ]\033[0m"
    elif latency_ms < 60:
        return f"\033[1;32m{latency_ms:.1f} ms\033[0m", "\033[1;32m[ 🟢 MUY BUENO ]\033[0m"
    elif latency_ms < 120:
        return f"\033[1;33m{latency_ms:.1f} ms\033[0m", "\033[1;33m[ 🟡 OPTIMO / JUGABLE ]\033[0m"
    elif latency_ms < 200:
        return f"\033[1;33m{latency_ms:.1f} ms\033[0m", "\033[1;33m[ 🟠 MODERADO ]\033[0m"
    else:
        return f"\033[1;31m{latency_ms:.1f} ms\033[0m", "\033[1;31m[ 🔴 ALTO / LAG ]\033[0m"

def ping_icmp(host, count=3, timeout_sec=2):
    try:
        out = subprocess.check_output(
            ["ping", "-c", str(count), "-W", str(timeout_sec), host],
            text=True,
            stderr=subprocess.DEVNULL
        )
        m = re.search(r"min/avg/max/(?:mdev|stddev) = ([0-9.]+)/([0-9.]+)/([0-9.]+)", out)
        loss_m = re.search(r"([0-9.]+)% packet loss", out)
        if m:
            avg_ms = float(m.group(2))
            loss = float(loss_m.group(1)) if loss_m else 0.0
            return avg_ms, loss
    except Exception:
        pass
    return None, 100.0

def ping_tcp(host, port, timeout_sec=2.5):
    t0 = time.perf_counter()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout_sec)
        s.connect((host, port))
        t1 = time.perf_counter()
        s.close()
        return (t1 - t0) * 1000.0
    except Exception:
        return None

def get_default_route():
    gw = "192.168.1.1"
    dev = "enp1s0"
    src_ip = None
    try:
        out = subprocess.check_output(["ip", "route"], text=True, stderr=subprocess.DEVNULL)
        for line in out.splitlines():
            if line.startswith("default via"):
                parts = line.split()
                if len(parts) >= 5:
                    gw = parts[2]
                    dev = parts[4]
                if "src" in parts:
                    src_ip = parts[parts.index("src") + 1]
                break
    except Exception:
        pass
    return gw, dev, src_ip

def get_interface_ips():
    ips = {}
    try:
        out = subprocess.check_output(["ip", "-br", "a"], text=True, stderr=subprocess.DEVNULL)
        for line in out.splitlines():
            parts = line.split()
            if len(parts) >= 2:
                name = parts[0]
                status = parts[1]
                addrs = [p.split("/")[0] for p in parts[2:] if not p.startswith("fe80")] if len(parts) >= 3 else []
                ips[name] = {"status": status, "ip": addrs[0] if addrs else "Sin IP", "all_ips": addrs}
    except Exception:
        pass
    return ips

def get_interface_speed(dev):
    speed_file = f"/sys/class/net/{dev}/speed"
    duplex_file = f"/sys/class/net/{dev}/duplex"
    speed = "N/D"
    duplex = ""
    try:
        if os.path.exists(speed_file):
            with open(speed_file) as f:
                val = f.read().strip()
                if val and int(val) > 0:
                    speed = f"{val} Mbps"
        if os.path.exists(duplex_file):
            with open(duplex_file) as f:
                duplex = f.read().strip()
    except Exception:
        pass
    return speed, duplex

def get_traffic_rates(dev):
    def read_dev():
        with open("/proc/net/dev") as f:
            for line in f:
                if f"{dev}:" in line:
                    data = line.split(":")[1].split()
                    return int(data[0]), int(data[8]), int(data[2]), int(data[10])
        return 0, 0, 0, 0

    try:
        rx1, tx1, rx_err1, tx_err1 = read_dev()
        time.sleep(0.25)
        rx2, tx2, rx_err2, tx_err2 = read_dev()

        dt = 0.25
        rx_speed = (rx2 - rx1) / dt / 1024.0
        tx_speed = (tx2 - tx1) / dt / 1024.0

        return rx_speed, tx_speed, rx2 / (1024**3), tx2 / (1024**3), rx_err2 + tx_err2
    except Exception:
        return 0.0, 0.0, 0.0, 0.0, 0

def get_public_ip():
    try:
        req = urllib.request.Request("https://api.ipify.org", headers={"User-Agent": "curl/7.68.0"})
        with urllib.request.urlopen(req, timeout=1.8) as resp:
            return resp.read().decode("utf-8").strip()
    except Exception:
        try:
            req = urllib.request.Request("https://ifconfig.me/ip", headers={"User-Agent": "curl/7.68.0"})
            with urllib.request.urlopen(req, timeout=1.8) as resp:
                return resp.read().decode("utf-8").strip()
        except Exception:
            return "N/D (Sin acceso directo)"

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
        return res
    except Exception:
        return None

def main():
    print("==================================================")
    print("           ESTADO DE RED Y LATENCIA (MC)          ")
    print("==================================================")

    gw, active_dev, src_ip = get_default_route()
    interfaces = get_interface_ips()

    active_ip = src_ip or interfaces.get(active_dev, {}).get("ip", "Desconocida")
    is_wifi = active_dev.startswith("wl") or "wlan" in active_dev
    type_desc = "Wi-Fi Inalámbrico" if is_wifi else "Cable Ethernet"

    speed, duplex = get_interface_speed(active_dev)
    speed_txt = f" ({speed} {duplex})" if speed != "N/D" else ""

    print(f" Interfaz Activa  : \033[1;36m{active_dev}\033[0m [\033[32m{type_desc}{speed_txt}\033[0m]")
    print(f" IP Local Servidor: \033[1;37m{active_ip}\033[0m (Subred LAN)")
    print(f" Puerta de Enlace : \033[1;37m{gw}\033[0m (Router Principal)")

    # Wi-Fi check
    wifi_dev = next((d for d in interfaces if d.startswith("wl")), None)
    if wifi_dev:
        w_status = interfaces.get(wifi_dev, {}).get("status", "DOWN")
        if w_status == "UP":
            w_ip = interfaces.get(wifi_dev, {}).get("ip", "Sin IP")
            print(f" Wi-Fi ({wifi_dev})    : \033[32mCONECTADO ({w_ip})\033[0m")
        else:
            print(f" Wi-Fi ({wifi_dev})    : \033[33mINACTIVO / EN REPOSO (Usando Cable)\033[0m")

    # Tailscale
    ts_ip = interfaces.get("tailscale0", {}).get("ip", None)
    if ts_ip:
        print(f" IP Tailscale VPN : \033[1;35m{ts_ip}\033[0m (\033[32mConectado\033[0m)")

    # Public Tunnel
    tunnel_host = os.getenv("MC_MINECRAFT_PUBLIC_IP", "mc.ejemplo.com")
    tunnel_port = int(os.getenv("MC_MINECRAFT_PUBLIC_PORT", "25565"))
    print(f" Dominio Publico  : \033[1;33m{tunnel_host}:{tunnel_port}\033[0m")

    pub_ip = get_public_ip()
    print(f" IP Publica WAN   : \033[37m{pub_ip}\033[0m")

    print("--------------------------------------------------")
    print("      METRICAS DE LATENCIA (PING EN TIEMPO REAL)  ")
    print("--------------------------------------------------")

    # 1. Router Local
    gw_ms, gw_loss = ping_icmp(gw, count=2, timeout_sec=1)
    gw_txt, gw_badge = get_color(gw_ms)
    print(f" Router LAN ({gw:<11}): {gw_txt:<18} {gw_badge}")

    # 2. DNS Google
    g_ms, g_loss = ping_icmp("8.8.8.8", count=2, timeout_sec=1.5)
    g_txt, g_badge = get_color(g_ms)
    print(f" Internet (Google) : {g_txt:<18} {g_badge}")

    # 3. DNS Cloudflare
    cf_ms, cf_loss = ping_icmp("1.1.1.1", count=2, timeout_sec=1.5)
    cf_txt, cf_badge = get_color(cf_ms)
    print(f" Internet (Cloudfl): {cf_txt:<18} {cf_badge}")

    # 4. Tunel Playit (TCP)
    tcp_ms = ping_tcp(tunnel_host, tunnel_port, timeout_sec=2.5)
    tcp_txt, tcp_badge = get_color(tcp_ms)
    print(f" Tunel Playit TCP  : {tcp_txt:<18} {tcp_badge}")

    # 5. Puerto Local Minecraft
    mc_local_ms = ping_tcp("127.0.0.1", 25565, timeout_sec=1.0)
    if mc_local_ms is not None:
        print(f" Minecraft Local   : \033[1;32m{mc_local_ms:.2f} ms\033[0m       \033[1;32m[ 🟢 EN LINEA (25565) ]\033[0m")
    else:
        print(f" Minecraft Local   : \033[1;33mCerrado / Reposo\033[0m   \033[1;33m[ 💤 PUERTO LIBRE ]\033[0m")

    print("--------------------------------------------------")
    print("           TRAFICO Y CONSUMO DE ANCHO DE BANDA    ")
    print("--------------------------------------------------")

    rx_rate, tx_rate, rx_tot_gb, tx_tot_gb, errs = get_traffic_rates(active_dev)
    print(f" Trafico Descarga  : \033[1;32m{rx_rate:.1f} KB/s\033[0m (Total: {rx_tot_gb:.2f} GB)")
    print(f" Trafico Subida    : \033[1;36m{tx_rate:.1f} KB/s\033[0m (Total: {tx_tot_gb:.2f} GB)")
    
    if errs == 0:
        print(" Calidad de Paquetes: \033[1;32m0 errores / 0% perdida en interfaz\033[0m")
    else:
        print(f" Calidad de Paquetes: \033[1;33m{errs} errores detectados\033[0m")

    # Players online check
    slp = ping_minecraft_slp()
    if slp:
        online = slp.get("players", {}).get("online", 0)
        max_p = slp.get("players", {}).get("max", 10)
        sample = slp.get("players", {}).get("sample", [])
        names = [p.get("name") for p in sample if p.get("name")]
        names_str = f" ({', '.join(names)})" if names else ""
        print(f" Jugadores Online  : \033[1;32m{online} / {max_p}{names_str}\033[0m")
    else:
        print(" Jugadores Online  : \033[33m0 (Servidor en reposo o sin respuesta SLP)\033[0m")

    print("==================================================")

if __name__ == "__main__":
    main()
