@echo off
echo ========================================
echo    UrbanClash - Iniciando Ambiente Local
echo ========================================
echo.

echo [1/4] Verificando Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker não está instalado ou não está rodando!
    echo Por favor, instale o Docker Desktop e tente novamente.
    pause
    exit /b 1
)
echo ✅ Docker está disponível

echo.
echo [2/4] Parando containers existentes...
docker-compose down

echo.
echo [3/4] Construindo e iniciando containers...
docker-compose up --build -d

echo.
echo [4/4] Aguardando serviços ficarem prontos...
timeout /t 10 /nobreak >nul

echo.
echo ========================================
echo    Ambiente iniciado com sucesso! 🚀
echo ========================================
echo.
echo 📊 PostgreSQL: localhost:5432
echo 🔧 Backend API: http://localhost:3001
echo 🌐 Frontend: http://localhost:3000
echo.
echo Para parar os serviços, execute: docker-compose down
echo Para ver logs, execute: docker-compose logs -f
echo.
pause