Write-Host ""
Write-Host "  MOBICYCLE - Iniciando Projeto..." -ForegroundColor Green
Write-Host ""

# 1. Subir o banco MySQL via Docker
Write-Host "[1/2] Subindo container MySQL..." -ForegroundColor Cyan
docker compose up -d db 2>&1 | Out-Null

# Aguardar o MySQL ficar pronto
Write-Host "       Aguardando MySQL ficar pronto..." -ForegroundColor Yellow
$attempts = 0
$maxAttempts = 30
while ($attempts -lt $maxAttempts) {
    $result = docker compose exec db mysqladmin ping -h localhost --silent 2>&1
    if ($result -match "alive") {
        break
    }
    Start-Sleep -Seconds 1
    $attempts++
}

if ($attempts -ge $maxAttempts) {
    Write-Host "       AVISO: MySQL pode nao estar pronto ainda, mas tentando iniciar o servidor..." -ForegroundColor Yellow
} else {
    Write-Host "       MySQL OK!" -ForegroundColor Green
}

# 2. Iniciar o servidor
Write-Host "[2/2] Iniciando servidor Node.js + Vite..." -ForegroundColor Cyan
Write-Host ""
Write-Host "  Acesse: http://localhost:3000" -ForegroundColor Green
Write-Host "  Pressione Ctrl+C para encerrar" -ForegroundColor DarkGray
Write-Host ""

# Sobrescreve DB_HOST para apontar para localhost (fora do Docker)
$env:DB_HOST = "127.0.0.1"
$env:NODE_ENV = "development"
npx tsx server.ts
