#!/bin/bash

# Script para fazer deploy no ambiente DEV (dev.settesaude.com.br)
echo "🚀 Deploy para ambiente DEV..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script na raiz do projeto${NC}"
    exit 1
fi

# Verificar se .env.development existe
if [ ! -f ".env.development" ]; then
    echo -e "${RED}❌ Erro: Arquivo .env.development não encontrado${NC}"
    exit 1
fi

# Atualizar código
echo -e "${YELLOW}📥 Atualizando código...${NC}"
git pull

# Instalar dependências
echo -e "${YELLOW}📦 Instalando dependências...${NC}"
npm ci

# Build para desenvolvimento
echo -e "${YELLOW}🔨 Fazendo build (modo development)...${NC}"
npm run build:dev

# Verificar se o build foi bem-sucedido
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro no build!${NC}"
    exit 1
fi

# Reiniciar PM2
echo -e "${YELLOW}🔄 Reiniciando servidor...${NC}"
pm2 restart crm-webhook

# Verificar status
echo -e "${YELLOW}📊 Status do servidor:${NC}"
pm2 status crm-webhook

echo -e "${GREEN}✅ Deploy concluído!${NC}"
echo -e "${GREEN}🌐 Acesse: https://dev.settesaude.com.br${NC}"
echo ""
echo -e "${YELLOW}💡 Dica: Verifique os logs com: pm2 logs crm-webhook${NC}"
