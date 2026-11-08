# MC-Desk Server Agent

Agente ligero y seguro para monitorear servidores de Minecraft y ejecutar acciones autorizadas desde el panel web de **MC-Desk**.

---

## Características

* 🔒 **100% Seguro:** No abre puertos adicionales ni expone RCON a Internet. Toda la comunicación sale hacia el backend de Render mediante HTTPS saliente.
* 🚀 **Cero dependencias pesadas:** Desarrollado en Python 3 puro utilizando la biblioteca estándar. Consume menos de 15 MB de memoria RAM.
* 📊 **Telemetría completa:** Envía uso de CPU, temperatura de procesador, memoria RAM, TPS, jugadores en línea y estado en vivo.
* ⚡ **Control remoto:** Permite ejecutar comandos de consola (como `time set day`, `weather clear`, `kick`, `ban`) en la sesión `screen` de Minecraft de forma no intrusiva.
* 🛡️ **Vinculación con Claim Token:** Vinculación segura de servidor con tokens de un solo uso (`MC-DESK-XXXX-YYYY`).

---

## Instalación rápida (Linux / Ubuntu / Debian)

1. Clona o copia la carpeta `server-agent` en tu servidor de Minecraft:
   ```bash
   cd /home/mcadmin/
   # o dentro de la carpeta del proyecto MC-Desk
   ```

2. Configura el archivo `config.json`:
   ```bash
   cp config.json.example config.json
   nano config.json
   ```
   Introduce la URL de tu backend y el `claim_code` generado en el panel web:
   ```json
   {
     "backend_url": "https://mc-desk-api.onrender.com",
     "claim_code": "MC-DESK-8F42-X92K",
     "agent_token": "",
     "screen_session": "minecraft",
     "poll_interval_seconds": 5
   }
   ```

3. Instala y activa el servicio con systemd:
   ```bash
   sudo ./install.sh
   ```

4. Revisa los logs en tiempo real:
   ```bash
   sudo journalctl -u mc-desk-agent -f
   ```
