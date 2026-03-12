# Script para iniciar backend e frontend com PM2
# Este script instala PM2 se necessário e inicia ambos os serviços

Write-Host "Iniciando servicos Urban Clash..." -ForegroundColor Green

# Verificar se PM2 está instalado
try {
    $pm2Version = npm list -g pm2 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Instalando PM2 globalmente..." -ForegroundColor Yellow
        npm install -g pm2
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Erro ao instalar PM2" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "PM2 ja esta instalado" -ForegroundColor Green
    }
} catch {
    Write-Host "Instalando PM2 globalmente..." -ForegroundColor Yellow
    npm install -g pm2
}

# Criar diretório de logs se não existir
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" -Force
    Write-Host "Diretorio de logs criado" -ForegroundColor Blue
}

# Parar processos existentes (se houver)
Write-Host "Parando processos existentes..." -ForegroundColor Yellow
pm2 stop ecosystem.config.js 2>$null
pm2 delete ecosystem.config.js 2>$null

# Instalar dependências do backend se necessário
if (!(Test-Path "backend/node_modules")) {
    Write-Host "Instalando dependencias do backend..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
}

# Instalar dependências do frontend se necessário
if (!(Test-Path "node_modules")) {
    Write-Host "Instalando dependencias do frontend..." -ForegroundColor Yellow
    npm install
}

# Iniciar serviços com PM2
Write-Host "Iniciando servicos com PM2..." -ForegroundColor Green
pm2 start ecosystem.config.js

if ($LASTEXITCODE -eq 0) {
    Write-Host "" 
    Write-Host "Servicos iniciados com sucesso!" -ForegroundColor Green
    Write-Host "" 
    Write-Host "Status dos servicos:" -ForegroundColor Cyan
    pm2 status
    Write-Host "" 
    Write-Host "URLs disponiveis:" -ForegroundColor Cyan
    Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "   Backend:  http://localhost:3001" -ForegroundColor White
    Write-Host "" 
    Write-Host "Comandos uteis:" -ForegroundColor Cyan
    Write-Host "   pm2 status          - Ver status dos servicos" -ForegroundColor White
    Write-Host "   pm2 logs            - Ver logs em tempo real" -ForegroundColor White
    Write-Host "   pm2 restart all     - Reiniciar todos os servicos" -ForegroundColor White
    Write-Host "   pm2 stop all        - Parar todos os servicos" -ForegroundColor White
    Write-Host "   pm2 delete all      - Remover todos os servicos" -ForegroundColor White
    Write-Host "" 
} else {
    Write-Host "Erro ao iniciar servicos" -ForegroundColor Red
    exit 1
}