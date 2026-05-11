#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando deploy de Mobicyclo para Produção...${NC}"

# 1. Verificar se o .env existe
if [ ! -f .env ]; then
    echo -e "${RED}ERRO: Arquivo .env não encontrado!${NC}"
    echo "Crie um arquivo .env baseado no .env.example e tente novamente."
    exit 1
fi

# 2. Carregar variáveis de ambiente
export $(grep -v '^#' .env | xargs)

# 3. Build das imagens
echo -e "${GREEN}1. Construindo imagens Docker...${NC}"
docker compose build

# 4. Parar e remover containers antigos (se existirem)
echo -e "${GREEN}2. Reiniciando serviços...${NC}"
docker compose down
docker compose up -d

# 5. Verificar status
echo -e "${YELLOW}Aguardando inicialização do Banco de Dados...${NC}"
sleep 10

docker compose ps

echo -e "${GREEN}--------------------------------------------------${NC}"
echo -e "${GREEN}Deploy concluído com sucesso!${NC}"
echo -e "Acesse: http://mobicycle.com.br"
echo -e "${GREEN}--------------------------------------------------${NC}"

echo -e "${YELLOW}Dica: Para habilitar SSL (HTTPS):${NC}"
echo -e "1. Certifique-se de que o domínio aponta para este IP."
echo -e "2. Instale certbot no host: sudo apt update && sudo apt install certbot"
echo -e "3. Rode: sudo certbot certonly --manual -d mobicycle.com.br -d www.mobicycle.com.br"
echo -e "4. Monte os certificados no docker-compose.yml ou use um proxy reverso externo."
