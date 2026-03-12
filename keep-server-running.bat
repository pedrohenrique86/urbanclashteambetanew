@echo off
echo Iniciando servidor backend em modo persistente...
echo ========================================
echo Para parar o servidor, pressione Ctrl+C
echo ========================================

:start
echo [%date% %time%] Iniciando servidor...
node backend/server.js
echo [%date% %time%] Servidor parou. Reiniciando em 3 segundos...
timeout /t 3 /nobreak >nul
goto start