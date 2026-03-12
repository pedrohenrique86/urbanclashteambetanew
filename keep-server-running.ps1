# Script para manter o servidor backend sempre rodando
Write-Host "Iniciando servidor backend em modo persistente..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Para parar o servidor, pressione Ctrl+C" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Função para capturar Ctrl+C
$null = Register-EngineEvent PowerShell.Exiting -Action {
    Write-Host "\nParando servidor..." -ForegroundColor Red
    exit
}

while ($true) {
    try {
        Write-Host "[$(Get-Date)] Iniciando servidor..." -ForegroundColor Cyan
        
        # Inicia o servidor
        $process = Start-Process -FilePath "node" -ArgumentList "backend/server.js" -NoNewWindow -PassThru -Wait
        
        Write-Host "[$(Get-Date)] Servidor parou (Exit Code: $($process.ExitCode)). Reiniciando em 3 segundos..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
    }
    catch {
        Write-Host "[$(Get-Date)] Erro: $($_.Exception.Message). Tentando novamente em 5 segundos..." -ForegroundColor Red
        Start-Sleep -Seconds 5
    }
}