# Script para parar todos os serviços PM2

Write-Host "🛑 Parando todos os serviços Urban Clash..." -ForegroundColor Yellow

# Verificar se PM2 está instalado
try {
    $pm2Version = npm list -g pm2 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ PM2 não está instalado" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ PM2 não está instalado" -ForegroundColor Red
    exit 1
}

# Mostrar status atual
Write-Host "📊 Status atual dos serviços:" -ForegroundColor Cyan
pm2 status

# Parar todos os serviços
Write-Host "🛑 Parando serviços..." -ForegroundColor Yellow
pm2 stop all

# Remover todos os serviços do PM2
Write-Host "🗑️ Removendo serviços do PM2..." -ForegroundColor Yellow
pm2 delete all

Write-Host "" 
Write-Host "✅ Todos os serviços foram parados e removidos!" -ForegroundColor Green
Write-Host ""