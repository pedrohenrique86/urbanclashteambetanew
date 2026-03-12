@echo off
echo 🚀 Iniciando serviços Urban Clash...

REM Verificar se PM2 está instalado
npm list -g pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Instalando PM2 globalmente...
    npm install -g pm2
    if %errorlevel% neq 0 (
        echo ❌ Erro ao instalar PM2
        pause
        exit /b 1
    )
) else (
    echo ✅ PM2 já está instalado
)

REM Criar diretório de logs se não existir
if not exist "logs" (
    mkdir logs
    echo 📁 Diretório de logs criado
)

REM Parar processos existentes (se houver)
echo 🛑 Parando processos existentes...
pm2 stop ecosystem.config.js >nul 2>&1
pm2 delete ecosystem.config.js >nul 2>&1

REM Instalar dependências do backend se necessário
if not exist "backend\node_modules" (
    echo 📦 Instalando dependências do backend...
    cd backend
    npm install
    cd ..
)

REM Instalar dependências do frontend se necessário
if not exist "node_modules" (
    echo 📦 Instalando dependências do frontend...
    npm install
)

REM Iniciar serviços com PM2
echo 🚀 Iniciando serviços com PM2...
pm2 start ecosystem.config.js

if %errorlevel% equ 0 (
    echo.
    echo ✅ Serviços iniciados com sucesso!
    echo.
    echo 📊 Status dos serviços:
    pm2 status
    echo.
    echo 🔗 URLs disponíveis:
    echo    Frontend: http://localhost:3000
    echo    Backend:  http://localhost:3001
    echo.
    echo 📋 Comandos úteis:
    echo    pm2 status          - Ver status dos serviços
    echo    pm2 logs            - Ver logs em tempo real
    echo    pm2 restart all     - Reiniciar todos os serviços
    echo    pm2 stop all        - Parar todos os serviços
    echo    pm2 delete all      - Remover todos os serviços
    echo.
) else (
    echo ❌ Erro ao iniciar serviços
    pause
    exit /b 1
)

pause