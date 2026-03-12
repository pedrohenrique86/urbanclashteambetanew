@echo off
echo === Iniciando Servicos Urban Clash ===

echo Verificando dependencias...

REM Instalar dependencias do backend se necessario
if not exist "backend\node_modules" (
    echo Instalando dependencias do backend...
    cd backend
    call npm install
    cd ..
)

REM Instalar dependencias do frontend se necessario
if not exist "node_modules" (
    echo Instalando dependencias do frontend...
    call npm install
)

REM Criar diretorio de logs se nao existir
if not exist "logs" (
    mkdir logs
)

echo.
echo Iniciando Backend na porta 3001...
start "Urban Clash Backend" cmd /k "node backend/server.js"

echo Aguardando 3 segundos...
timeout /t 3 /nobreak >nul

echo Iniciando Frontend na porta 3000...
start "Urban Clash Frontend" cmd /k "npm start"

echo.
echo === Servicos Iniciados ===
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Os servicos estao rodando em janelas separadas do CMD.
echo Para parar os servicos, feche as janelas correspondentes ou use Ctrl+C.
echo.
pause