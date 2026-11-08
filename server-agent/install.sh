#!/usr/bin/env bash
# =============================================================================
# MC-Desk Server Agent — One-Step Systemd Installer
# Usage:
#   sudo ./install.sh --url https://tu-backend.com --claim MC-DESK-XXXX-YYYY
#   o de forma interactiva ejecutando simplemente: sudo ./install.sh
# =============================================================================
set -e

BACKEND_URL=""
CLAIM_CODE=""
MC_DIR=""
SCREEN_NAME="minecraft"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)
      BACKEND_URL="$2"
      shift 2
      ;;
    --claim)
      CLAIM_CODE="$2"
      shift 2
      ;;
    --dir)
      MC_DIR="$2"
      shift 2
      ;;
    --screen)
      SCREEN_NAME="$2"
      shift 2
      ;;
    *)
      # Support positional: $1 = URL or CLAIM
      if [[ -z "$BACKEND_URL" && "$1" == http* ]]; then
        BACKEND_URL="$1"
      elif [[ -z "$CLAIM_CODE" && "$1" == MC-DESK* ]]; then
        CLAIM_CODE="$1"
      fi
      shift
      ;;
  esac
done

echo "========================================================="
echo "   🚀 INSTALADOR AUTOMÁTICO DE MC-DESK SERVER AGENT     "
echo "========================================================="

if [ "$EUID" -ne 0 ]; then
  echo "[!] Se requieren permisos de superusuario (root) para instalar el servicio."
  echo "    Ejecuta: sudo $0 $@"
  exit 1
fi

# Detect Python 3
if ! command -v python3 &> /dev/null; then
  echo "[*] Python 3 no encontrado. Intentando instalar..."
  if command -v apt-get &> /dev/null; then
    apt-get update && apt-get install -y python3
  elif command -v yum &> /dev/null; then
    yum install -y python3
  else
    echo "[x] Error: Por favor instala Python 3 manualmente antes de continuar."
    exit 1
  fi
fi

CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
chmod +x "$CURRENT_DIR/agent.py"

# Interactive prompt if parameters missing
if [ -z "$BACKEND_URL" ]; then
  read -p "Introduce la URL del backend MC-Desk [http://localhost:3000]: " input_url
  BACKEND_URL="${input_url:-http://localhost:3000}"
fi

if [ -z "$CLAIM_CODE" ]; then
  if [ ! -f "$CURRENT_DIR/config.json" ] || ! grep -q "agent_token" "$CURRENT_DIR/config.json"; then
    read -p "Introduce el Claim Code del panel (ej: MC-DESK-ABCD-1234): " input_claim
    CLAIM_CODE="$input_claim"
  fi
fi

# Write config.json
CONFIG_FILE="$CURRENT_DIR/config.json"
echo "[*] Configurando $CONFIG_FILE..."

python3 -c "
import json, os

cfg = {
    'backend_url': '$BACKEND_URL',
    'claim_code': '$CLAIM_CODE',
    'agent_token': '',
    'minecraft_dir': '$MC_DIR',
    'screen_session': '$SCREEN_NAME',
    'tmux_session': '',
    'server_software': 'Forge',
    'server_version': '1.20.1',
    'poll_interval_seconds': 3,
    'backups_dir': ''
}

if os.path.exists('$CONFIG_FILE'):
    try:
        with open('$CONFIG_FILE') as f:
            existing = json.load(f)
            # Keep existing token if present
            if existing.get('agent_token'):
                cfg['agent_token'] = existing['agent_token']
            for k in ('minecraft_dir', 'screen_session', 'server_software'):
                if existing.get(k): cfg[k] = existing[k]
    except Exception:
        pass

with open('$CONFIG_FILE', 'w') as f:
    json.dump(cfg, f, indent=2)
"

# Determine running user
RUN_USER=$(logname 2>/dev/null || echo "$SUDO_USER")
if [ -z "$RUN_USER" ] || [ "$RUN_USER" == "root" ]; then
  if id "mcadmin" &>/dev/null; then
    RUN_USER="mcadmin"
  else
    RUN_USER="root"
  fi
fi

SERVICE_FILE="/etc/systemd/system/mc-desk-agent.service"
echo "[*] Creando servicio systemd en $SERVICE_FILE (Usuario: $RUN_USER)..."

cat << EOF > "$SERVICE_FILE"
[Unit]
Description=MC-Desk Minecraft Server Agent Daemon
After=network.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$CURRENT_DIR
ExecStart=/usr/bin/python3 $CURRENT_DIR/agent.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable mc-desk-agent.service
systemctl restart mc-desk-agent.service

echo "========================================================="
echo "   [✓] MC-Desk Agent instalado y corriendo con éxito!     "
echo "   Estado del servicio : sudo systemctl status mc-desk-agent"
echo "   Logs en vivo        : sudo journalctl -u mc-desk-agent -f"
echo "========================================================="
