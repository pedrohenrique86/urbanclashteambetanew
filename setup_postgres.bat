@echo off
echo ========================================
echo    CONFIGURACAO DO BANCO POSTGRESQL
echo ========================================
echo.
echo Este script vai:
echo 1. Criar o banco de dados 'urbanclash'
echo 2. Executar o script de criacao das tabelas
echo 3. Mostrar as tabelas criadas
echo.
pause

echo.
echo Criando banco de dados 'urbanclash'...
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE urbanclash;" 2>nul
if %errorlevel% equ 0 (
    echo ✓ Banco 'urbanclash' criado com sucesso!
) else (
    echo ⚠ Banco 'urbanclash' ja existe ou erro na criacao
)

echo.
echo Executando script de criacao das tabelas...
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d urbanclash -f setup_database.sql

if %errorlevel% equ 0 (
    echo.
    echo ✓ Tabelas criadas com sucesso!
    echo.
    echo Listando tabelas criadas:
    "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d urbanclash -c "\dt"
) else (
    echo ❌ Erro ao criar tabelas
)

echo.
echo ========================================
echo           CONFIGURACAO COMPLETA
echo ========================================
echo.
echo Para conectar ao banco:
echo psql -U postgres -d urbanclash
echo.
echo Para ver usuarios cadastrados:
echo SELECT * FROM users;
echo.
echo Para deletar um usuario:
echo DELETE FROM users WHERE email = 'email@exemplo.com';
echo.
pause