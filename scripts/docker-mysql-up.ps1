# Sobe MySQL 8 com docker run usando as mesmas credenciais do .env.example.
# Uso:
#   .\scripts\docker-mysql-up.ps1
#   .\scripts\docker-mysql-up.ps1 -RemoveExisting   # remove o container antigo e cria de novo
#   .\scripts\docker-mysql-up.ps1 -Port 3307        # se 3306 já estiver em uso no host
param(
  [switch]$RemoveExisting,
  [string]$Port = "3306"
)

$ErrorActionPreference = "Stop"

# Valores espelhados de .env.example (MySQL)
$rootPass = "rootpass123"
$dbName = "mobicyclo"
$dbUser = "mobicyclo"
$dbPass = "mobicyclo123"
$container = "mobicyclo-db"
$volume = "mobicyclo_mysql_run_data"
$image = "mysql:8.0"

Write-Host "[docker-mysql] Baixando imagem $image (se ainda não existir localmente)..."
docker pull $image
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if ($RemoveExisting) {
  Write-Host "[docker-mysql] Removendo container existente $container..."
  docker rm -f $container 2>$null | Out-Null
}

docker inspect $container 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
  Write-Host "[docker-mysql] O container '$container' já existe. Pare com: docker rm -f $container"
  Write-Host "           Ou recrie com: .\scripts\docker-mysql-up.ps1 -RemoveExisting"
  exit 1
}

Write-Host "[docker-mysql] Criando volume nomeado $volume (dados persistentes)..."
docker volume create $volume 2>$null | Out-Null

Write-Host "[docker-mysql] Iniciando $container na porta host ${Port}:3306..."
docker run -d `
  --name $container `
  --restart unless-stopped `
  -p "${Port}:3306" `
  -v "${volume}:/var/lib/mysql" `
  -e "MYSQL_ROOT_PASSWORD=$rootPass" `
  -e "MYSQL_DATABASE=$dbName" `
  -e "MYSQL_USER=$dbUser" `
  -e "MYSQL_PASSWORD=$dbPass" `
  $image `
  --default-authentication-plugin=mysql_native_password `
  --character-set-server=utf8mb4 `
  --collation-server=utf8mb4_unicode_ci

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[docker-mysql] OK. Aguarde ~10–30 s o MySQL inicializar."
Write-Host "           Teste: npm run db:test   (com DB_HOST=localhost ou sem DB_TEST_HOST)"
