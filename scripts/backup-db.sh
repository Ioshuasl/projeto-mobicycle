#!/bin/bash

# Carrega as variáveis de ambiente do arquivo .env
if [ -f "/root/mobicycle/.env" ]; then
    export $(grep -v '^#' /root/mobicycle/.env | xargs)
fi

# Configurações
BACKUP_DIR="/root/mobicycle/backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
DB_CONTAINER="mobicyclo-db"
DB_NAME="${MYSQL_DATABASE:-wayfy}"

# Garante que o diretório existe
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Iniciando backup do banco de dados $DB_NAME..."

# Executa o dump via Docker (usando variáveis internas do container) e comprime
# Usamos set -o pipefail para capturar erros do mysqldump mesmo com o gzip
set -o pipefail
docker exec "$DB_CONTAINER" sh -c 'exec mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' | gzip > "$BACKUP_DIR/backup_$DB_NAME_$TIMESTAMP.sql.gz"

if [ $? -eq 0 ]; then
    echo "[$(date)] Backup concluído com sucesso: $BACKUP_DIR/backup_$DB_NAME_$TIMESTAMP.sql.gz"
    
    # Limpeza: Remove backups com mais de 7 dias
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +7 -delete
    echo "[$(date)] Limpeza de backups antigos concluída."

    # Envio para o Telegram
    MESSAGE="✅ *Backup Mobicycle Concluído\!*"
    FILE_PATH="$BACKUP_DIR/backup_$DB_NAME_$TIMESTAMP.sql.gz"

    curl -s -F document=@"$FILE_PATH" \
         -F chat_id="$TELEGRAM_CHAT_ID" \
         -F caption="$MESSAGE" \
         -F parse_mode="MarkdownV2" \
         "https://api.telegram.org/bot$TELEGRAM_TOKEN/sendDocument" > /dev/null

    if [ $? -eq 0 ]; then
        echo "[$(date)] Backup enviado para o Telegram com sucesso."
    else
        echo "[$(date)] AVISO: Falha ao enviar backup para o Telegram."
    fi
else
    echo "[$(date)] ERRO: Falha ao realizar o backup! Verifique as credenciais ou o status do container."
    # Remove o arquivo corrompido (vazio) em caso de erro
    rm -f "$BACKUP_DIR/backup_$DB_NAME_$TIMESTAMP.sql.gz"
    
    # Notifica erro no Telegram
    curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_TOKEN/sendMessage" \
         -d chat_id="$TELEGRAM_CHAT_ID" \
         -d text="❌ ERRO CRÍTICO: Falha ao realizar o backup do Mobicycle!" > /dev/null
    
    exit 1
fi
