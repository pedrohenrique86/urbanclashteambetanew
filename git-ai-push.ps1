function gai {
    git add .

    $diff = git diff --cached
    if ([string]::IsNullOrWhiteSpace($diff)) {
        Write-Host "Nada para commitar."
        return
    }

    $msg = $diff | codex "gere uma mensagem de commit curta e profissional em padrão conventional commits, em uma única linha, começando com feat, fix, perf, refactor, style ou chore"
    $msg = ($msg | Out-String).Trim()

    if ([string]::IsNullOrWhiteSpace($msg)) {
        $msg = "chore: update"
    }

    Write-Host "Commit gerado: $msg"

    git commit -m "$msg"
    if ($LASTEXITCODE -ne 0) { return }

    git push
}