#!/usr/bin/env bash
# ==============================================================================
# MC-Desk CLI Controller (API Powered - Zero SSH)
# Interacts with the MC-Desk Cloud / Local API via HTTPS/HTTP
# Usage:
#   ./mc.sh status
#   ./mc.sh wake [serverId]
#   ./mc.sh cmd "say ¡Hola desde MC-Desk CLI!" [serverId]
#   ./mc.sh agent-status
# ==============================================================================

[ -f .env ] && set -a && source .env && set +a
[ -f backend/.env ] && set -a && source backend/.env && set +a

API_URL="${API_URL:-http://localhost:3000}"
SUBCMD="${1:-status}"
ARG2="${2:-}"
ARG3="${3:-}"

case "$SUBCMD" in
  status|info)
    echo "🔍 Consultando estado del servidor en $API_URL..."
    curl -s "${API_URL}/api/servers" | python3 -m json.tool 2>/dev/null || curl -s "${API_URL}/api/servers"
    ;;
  wake|start)
    SERVER_ID="${ARG2:-s-1}"
    echo "⚡ Enviando señal de inicio al servidor ($SERVER_ID) vía Agent API..."
    curl -s -X POST "${API_URL}/api/servers/${SERVER_ID}/wake" \
      -H "Content-Type: application/json" | python3 -m json.tool 2>/dev/null
    ;;
  cmd|command)
    CMD_STR="$ARG2"
    SERVER_ID="${ARG3:-s-1}"
    if [ -z "$CMD_STR" ]; then
      echo "Uso: ./mc.sh cmd \"<comando_minecraft>\" [serverId]"
      exit 1
    fi
    echo "💻 Enviando comando al servidor: /$CMD_STR..."
    curl -s -X POST "${API_URL}/api/servers/${SERVER_ID}/admin/command" \
      -H "Content-Type: application/json" \
      -d "{\"command\":\"$CMD_STR\"}" | python3 -m json.tool 2>/dev/null
    ;;
  agent-status|ping)
    echo "📡 Verificando estado de Agent API en $API_URL..."
    curl -s "${API_URL}/api/agent/ping" | python3 -m json.tool 2>/dev/null
    ;;
  *)
    echo "Uso: ./mc.sh [status | wake | cmd \"<comando>\" | agent-status]"
    ;;
esac
