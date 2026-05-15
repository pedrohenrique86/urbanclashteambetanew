#!/bin/bash
# =============================================================================
# Urban Clash - Script de Deploy VM (PM2)
# Garante que o backend roda na porta 3001, sobrevive ao Ctrl+C e
# reinicia automaticamente em caso de crash ou reboot da VM.
# =============================================================================

set -e

APP_DIR="/home/ubuntu/urbanclashteambetanew/backend"
APP_NAME="backend"
PM2_ECOSYSTEM="$APP_DIR/ecosystem.config.js"

echo "============================================="
echo "  Urban Clash - Deploy Backend (PM2)"
echo "============================================="

# --- 1. Matar processos presos nas portas 3001 e 3002 ---
echo ""
echo "🔪 [1/6] Liberando portas 3001 e 3002..."

for PORT in 3001 3002; do
  PID=$(lsof -ti tcp:$PORT 2>/dev/null || true)
  if [ -n "$PID" ]; then
    echo "  → Matando processo $PID na porta $PORT"
    kill -9 $PID 2>/dev/null || true
    sleep 1
  else
    echo "  → Porta $PORT já está livre"
  fi
done

# --- 2. Instalar PM2 globalmente se não estiver instalado ---
echo ""
echo "📦 [2/6] Verificando PM2..."

if ! command -v pm2 &> /dev/null; then
  echo "  → PM2 não encontrado. Instalando globalmente..."
  npm install -g pm2
  echo "  → PM2 instalado com sucesso"
else
  echo "  → PM2 já está instalado: $(pm2 -v)"
fi

# --- 3. Ir para o diretório do backend ---
echo ""
echo "📁 [3/6] Acessando diretório: $APP_DIR"
cd "$APP_DIR"

# --- 4. Instalar dependências se necessário ---
echo ""
echo "📥 [4/6] Instalando dependências do Node.js..."
npm install --omit=dev

# --- 5. Parar instância anterior do PM2 (se existir) ---
echo ""
echo "🛑 [5/6] Parando instância anterior no PM2 (se existir)..."
pm2 delete "$APP_NAME" 2>/dev/null || echo "  → Nenhuma instância anterior encontrada"

# --- 6. Iniciar com PM2 ---
echo ""
echo "🚀 [6/6] Iniciando servidor com PM2 na porta 3001..."

pm2 start server.js \
  --name "$APP_NAME" \
  --node-args="--max-old-space-size=512" \
  --env NODE_ENV=production \
  --log "$APP_DIR/logs/pm2-combined.log" \
  --error "$APP_DIR/logs/pm2-error.log" \
  --output "$APP_DIR/logs/pm2-out.log" \
  --time \
  --restart-delay=3000 \
  --max-restarts=10 \
  --exp-backoff-restart-delay=100

# --- Salvar configuração do PM2 para sobreviver ao reboot ---
pm2 save

# --- Configurar PM2 para iniciar no boot (executa o comando gerado) ---
echo ""
echo "🔄 Configurando PM2 para iniciar automaticamente no boot da VM..."
pm2 startup | tail -1 | bash 2>/dev/null || \
  echo "  ⚠️  Execute manualmente o comando de 'pm2 startup' como root se necessário"

# --- Status final ---
echo ""
echo "============================================="
echo "  ✅ Deploy concluído!"
echo "============================================="
echo ""
pm2 status "$APP_NAME"
echo ""
echo "📋 Comandos úteis:"
echo "  pm2 logs $APP_NAME         → ver logs em tempo real"
echo "  pm2 restart $APP_NAME      → reiniciar o servidor"
echo "  pm2 stop $APP_NAME         → parar o servidor"
echo "  pm2 delete $APP_NAME       → remover do PM2"
echo "  pm2 monit                  → monitor interativo"
echo ""
