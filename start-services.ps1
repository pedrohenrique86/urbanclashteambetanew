# UrbanClash - Script de Inicialização Permanente
# Este script mantém o backend e frontend rodando de forma estável

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[START] UrbanClash - Iniciando Servicos" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Função para verificar se uma porta está em uso
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Função para matar processos em uma porta específica
function Stop-ProcessOnPort {
    param([int]$Port)
    $processes = netstat -ano | findstr ":$Port"
    if ($processes) {
        $processes | ForEach-Object {
            $line = $_.Trim()
            if ($line -match "\s+(\d+)$") {
                $processId = $matches[1]
                try {
                    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    Write-Host "[OK] Processo $processId na porta $Port encerrado" -ForegroundColor Green
                } catch {
                    Write-Host "[WARN] Nao foi possivel encerrar processo $processId" -ForegroundColor Yellow
                }
            }
        }
    }
}

# Função para iniciar o backend
function Start-Backend {
    Write-Host "[BACKEND] Iniciando Backend..." -ForegroundColor Yellow
    
    # Verificar se a porta 3001 está livre
    if (Test-Port 3001) {
        Write-Host "[Backend] Porta 3001 em uso, liberando..." -ForegroundColor Yellow
        Stop-ProcessOnPort 3001
        Start-Sleep -Seconds 2
    }
    
    # Iniciar backend
    $backendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        npm run backend:dev
    }
    
    # Aguardar o backend inicializar
    $timeout = 30
    $elapsed = 0
    
    while ($elapsed -lt $timeout) {
        if (Test-Port 3001) {
            Write-Host "[OK] Backend iniciado com sucesso na porta 3001" -ForegroundColor Green
            return $backendJob
        }
        Start-Sleep -Seconds 1
        $elapsed++
    }
    
    Write-Host "❌ Timeout: Backend não iniciou em $timeout segundos" -ForegroundColor Red
    return $null
}

# Função para iniciar o frontend
function Start-Frontend {
    Write-Host "[FRONTEND] Iniciando Frontend..." -ForegroundColor Cyan
    
    # Verificar se a porta 3000 está livre
    if (Test-Port 3000) {
        Write-Host "[Frontend] Porta 3000 em uso, liberando..." -ForegroundColor Yellow
        Stop-ProcessOnPort 3000
        Start-Sleep -Seconds 2
    }
    
    # Iniciar frontend
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        npm start
    }
    
    # Aguardar o frontend inicializar
    $timeout = 60
    $elapsed = 0
    
    while ($elapsed -lt $timeout) {
        if (Test-Port 3000) {
            Write-Host "[OK] Frontend iniciado com sucesso na porta 3000" -ForegroundColor Green
            return $frontendJob
        }
        Start-Sleep -Seconds 1
        $elapsed++
    }
    
    Write-Host "❌ Timeout: Frontend não iniciou em $timeout segundos" -ForegroundColor Red
    return $null
}

# Função para monitorar e reiniciar serviços
function Monitor-Services {
    param($BackendJob, $FrontendJob)
    
    Write-Host "" 
    Write-Host "[MONITOR] Monitorando servicos..." -ForegroundColor Cyan
    Write-Host "[INFO] Pressione Ctrl+C para parar todos os servicos" -ForegroundColor Magenta
    Write-Host ""
    
    while ($true) {
        # Verificar backend
        if ($BackendJob -and $BackendJob.State -eq "Completed") {
            Write-Host "⚠️  Backend parou, reiniciando..." -ForegroundColor Yellow
            $BackendJob = Start-Backend
        } elseif (-not (Test-Port 3001)) {
            Write-Host "⚠️  Backend não responde na porta 3001, reiniciando..." -ForegroundColor Yellow
            if ($BackendJob) { Stop-Job $BackendJob -ErrorAction SilentlyContinue }
            $BackendJob = Start-Backend
        }
        
        # Verificar frontend
        if ($FrontendJob -and $FrontendJob.State -eq "Completed") {
            Write-Host "⚠️  Frontend parou, reiniciando..." -ForegroundColor Yellow
            $FrontendJob = Start-Frontend
        } elseif (-not (Test-Port 3000)) {
            Write-Host "⚠️  Frontend não responde na porta 3000, reiniciando..." -ForegroundColor Yellow
            if ($FrontendJob) { Stop-Job $FrontendJob -ErrorAction SilentlyContinue }
            $FrontendJob = Start-Frontend
        }
        
        # Status dos serviços
        $backendStatus = if (Test-Port 3001) { "[OK] Online" } else { "[X] Offline" }
        $frontendStatus = if (Test-Port 3000) { "[OK] Online" } else { "[X] Offline" }
        
        Write-Host "`r[$(Get-Date -Format 'HH:mm:ss')] Backend: $backendStatus | Frontend: $frontendStatus" -NoNewline
        
        Start-Sleep -Seconds 5
    }
}

# Função de limpeza
function Cleanup {
    Write-Host "`n`n[STOP] Encerrando servicos..." -ForegroundColor Red
    
    # Parar jobs
    Get-Job | Stop-Job -ErrorAction SilentlyContinue
    Get-Job | Remove-Job -ErrorAction SilentlyContinue
    
    # Liberar portas
    Stop-ProcessOnPort 3001
    Stop-ProcessOnPort 3000
    
    Write-Host "✅ Todos os serviços foram encerrados" -ForegroundColor Green
}

# Configurar handler para Ctrl+C
$null = Register-EngineEvent PowerShell.Exiting -Action { Cleanup }

try {
    # Iniciar serviços
    $backendJob = Start-Backend
    Start-Sleep -Seconds 3
    $frontendJob = Start-Frontend
    
    if ($backendJob -or $frontendJob) {
        Write-Host "" 
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "[SUCCESS] Servicos iniciados com sucesso!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "[BACKEND] Backend API: http://localhost:3001" -ForegroundColor White
        Write-Host "[FRONTEND] Frontend: http://localhost:3000" -ForegroundColor White
        Write-Host "========================================" -ForegroundColor Green
        
        # Monitorar serviços
        Monitor-Services $backendJob $frontendJob
    } else {
        Write-Host "❌ Falha ao iniciar os serviços" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    Cleanup
}