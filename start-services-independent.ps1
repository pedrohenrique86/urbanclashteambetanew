# Script para iniciar Backend e Frontend de forma independente
# Este script mantem ambos os servicos rodando sem depender do PM2

Write-Host "=== Iniciando Servicos Urban Clash ===" -ForegroundColor Green

# Verificar se as dependencias estao instaladas
Write-Host "Verificando dependencias..." -ForegroundColor Yellow

# Instalar dependencias do backend se necessario
if (!(Test-Path "backend/node_modules")) {
    Write-Host "Instalando dependencias do backend..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
}

# Instalar dependencias do frontend se necessario
if (!(Test-Path "node_modules")) {
    Write-Host "Instalando dependencias do frontend..." -ForegroundColor Yellow
    npm install
}

# Criar diretorio de logs se nao existir
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs"
}

# Funcao para iniciar o backend
function Start-Backend {
    Write-Host "Iniciando Backend na porta 3001..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node backend/server.js" -WindowStyle Normal
}

# Funcao para iniciar o frontend
function Start-Frontend {
    Write-Host "Iniciando Frontend na porta 3000..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm start" -WindowStyle Normal
}

# Iniciar os servicos
Start-Backend
Start-Sleep -Seconds 3
Start-Frontend

Write-Host "" 
Write-Host "=== Servicos Iniciados ===" -ForegroundColor Green
Write-Host "Backend: http://localhost:3001" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "" 
Write-Host "Os servicos estao rodando em janelas separadas do PowerShell." -ForegroundColor Yellow
Write-Host "Para parar os servicos, feche as janelas correspondentes ou use Ctrl+C." -ForegroundColor Yellow
Write-Host "" 
Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")