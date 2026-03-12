# Script para testar a API de rankings de usuários
try {
    Write-Host "Testando API de rankings de usuários..." -ForegroundColor Green
    
    $headers = @{
        'Accept' = 'application/json'
        'Content-Type' = 'application/json'
    }
    
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/users/rankings" -Method GET -Headers $headers -ErrorAction Stop
    
    Write-Host "✅ Sucesso! Resposta recebida:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erro capturado:" -ForegroundColor Red
    Write-Host "Tipo: $($_.Exception.GetType().Name)" -ForegroundColor Yellow
    Write-Host "Mensagem: $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
        Write-Host "Status Description: $($_.Exception.Response.StatusDescription)" -ForegroundColor Yellow
        
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Corpo da resposta de erro: $errorBody" -ForegroundColor Yellow
        } catch {
            Write-Host "Não foi possível ler o corpo da resposta de erro" -ForegroundColor Yellow
        }
    }
    
    Write-Host "Stack trace: $($_.ScriptStackTrace)" -ForegroundColor Yellow
}

Write-Host "\nTeste concluído." -ForegroundColor Green