@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo    UrbanClash - Iniciando Serviços
echo ========================================
echo.

echo [1/3] Verificando e liberando portas...

:: Função para matar processos nas portas 3000 e 3001
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001"') do (
    echo Encerrando processo %%a na porta 3001...
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do (
    echo Encerrando processo %%a na porta 3000...
    taskkill /F /PID %%a >nul 2>&1
)

echo ✅ Portas liberadas
echo.

echo [2/3] Iniciando Backend...
start "UrbanClash Backend" cmd /k "npm run backend:dev"

echo Aguardando backend inicializar...
timeout /t 5 /nobreak >nul

echo [3/3] Iniciando Frontend...
start "UrbanClash Frontend" cmd /k "npm start"

echo.
echo ========================================
echo    Serviços Iniciados! 🚀
echo ========================================
echo.
echo 🔧 Backend API: http://localhost:3001
echo 🌐 Frontend: http://localhost:3000
echo.
echo ⚠️  IMPORTANTE:
echo - Mantenha as janelas do backend e frontend abertas
echo - Para parar os serviços, feche as janelas ou pressione Ctrl+C
echo - Se algum serviço parar, execute este script novamente
echo.
echo Pressione qualquer tecla para continuar...
pause >nul