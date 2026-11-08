#!/usr/bin/env bash
[ -f .env ] && set -a && source .env && set +a
[ -f backend/.env ] && set -a && source backend/.env && set +a

SUBCMD="${1:-status}"
SOCKET="${MC_SOCKET_PATH:-/tmp/ssh_mux_mcserver}"
REMOTE_USER="${MC_REMOTE_USER:-mcadmin}"
REMOTE_HOST="${MC_REMOTE_HOST:-127.0.0.1}"
REMOTE="${REMOTE_USER}@${REMOTE_HOST}"

if [ ! -S "$SOCKET" ]; then
  ssh -o StrictHostKeyChecking=no "$REMOTE" "mc $SUBCMD"
else
  ssh -S "$SOCKET" "$REMOTE" "mc $SUBCMD"
fi
