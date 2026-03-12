# Teste da API de ranking usando PowerShell
Write-Host "Testando API de ranking na porta 3001..."

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/users/rankings?faction=gangsters&limit=10" -Method GET -TimeoutSec 10 -Headers @{"Accept" = "application/json"}
    Write-Host "Sucesso! Resposta:"
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "Erro: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)"
        try {
            $errorBody = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorBody)
            $errorText = $reader.ReadToEnd()
            Write-Host "Corpo do erro: $errorText"
        } catch {
            Write-Host "Nao foi possivel ler o corpo do erro"
        }
    }
}