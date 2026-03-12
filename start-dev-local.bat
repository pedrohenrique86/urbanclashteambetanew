@echo off
echo Iniciando ambiente de desenvolvimento local...

echo Iniciando servidor backend...
start cmd /k "cd backend && npm start"

echo Aguardando 5 segundos para o backend iniciar...
timeout /t 5 /nobreak > nul

echo Iniciando frontend...
start cmd /k "npm run dev"

echo Ambiente de desenvolvimento iniciado!
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173