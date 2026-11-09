#!/usr/bin/env bash
# ==============================================================================
# MC-Desk Local API Service Manager
# Permite consultar el estado, salud y levantar el backend localmente
# Uso: ./mc-api.sh [health | ping | dev | start | test]
# ==============================================================================

[ -f .env ] && set -a && source .env && set +a
[ -f backend/.env ] && set -a && source backend/.env && set +a

ACTION="${1:-health}"
PORT="${PORT:-3000}"
API_URL="http://localhost:${PORT}"

case "$ACTION" in
  health|status)
    echo "🔍 Consultando salud de MC-Desk API en $API_URL/health..."
    curl -s "${API_URL}/health" | python3 -m json.tool 2>/dev/null || curl -s "${API_URL}/health"
    ;;
  ping|agent)
    echo "📡 Verificando conexión de Agent API en $API_URL/api/agent/ping..."
    curl -s "${API_URL}/api/agent/ping" | python3 -m json.tool 2>/dev/null
    ;;
  test)
    echo "🧪 Ejecutando suite de pruebas de seguridad y endpoints..."
    cd backend && npm test
    ;;
  dev)
    echo "🚀 Iniciando servidor de desarrollo..."
    cd backend && npm run dev
    ;;
  start)
    echo "🚀 Iniciando servidor en producción..."
    cd backend && npm start
    ;;
  *)
    echo "Uso: ./mc-api.sh [health | ping | test | dev | start]"
    ;;
esac
