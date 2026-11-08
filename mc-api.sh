#!/usr/bin/env bash
# ==============================================================================
# MC-Desk Local CLI Control Wrapper
# Permite controlar el servicio mc-api desde la máquina local o remota
# Uso: ./mc-api.sh [status | up | down | test]
# ==============================================================================

[ -f .env ] && set -a && source .env && set +a
[ -f backend/.env ] && set -a && source backend/.env && set +a

ACTION="${1:-status}"
SOCKET="${MC_SOCKET_PATH:-/tmp/ssh_mux_mcserver}"
REMOTE_USER="${MC_REMOTE_USER:-mcadmin}"
REMOTE_HOST="${MC_REMOTE_HOST:-127.0.0.1}"
REMOTE="${REMOTE_USER}@${REMOTE_HOST}"

if [ ! -S "$SOCKET" ]; then
  # Conexión SSH estándar
  ssh -o StrictHostKeyChecking=no "$REMOTE" "mc-api $ACTION"
else
  # Conexión SSH multiplexada rápida
  ssh -S "$SOCKET" "$REMOTE" "mc-api $ACTION"
fi
