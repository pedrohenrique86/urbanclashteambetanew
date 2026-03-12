@echo off
echo 🛑 Parando todos os serviços Urban Clash...

REM Verificar se PM2 está instalado
npm list -g pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PM2 não está instalado
    pause
    exit /b 1
)

REM Mostrar status atual
echo 📊 Status atual dos serviços:
pm2 status

REM Parar todos os serviços
echo 🛑 Parando serviços...
pm2 stop all

REM Remover todos os serviços do PM2
echo 🗑️ Removendo serviços do PM2...
pm2 delete all

echo.
echo ✅ Todos os serviços foram parados e removidos!
echo.

pause