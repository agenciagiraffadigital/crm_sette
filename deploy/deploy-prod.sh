#!/bin/bash

# Script para fazer deploy no ambiente PRODUÇÃO (sistema.settesaude.com.br)
echo "🚀 Deploy para ambiente PRODUÇÃO..."

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

# Verificar se .env.production existe e está configurado
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ Erro: Arquivo .env.production não encontrado${NC}"
    exit 1
fi

# Verificar se ainda tem placeholders
if grep -q "xxxxx" .env.production; then
    echo -e "${RED}❌ ATENÇÃO: .env.production ainda contém placeholders!${NC}"
    echo -e "${RED}Configure as credenciais de PRODUÇÃO antes de fazer deploy.${NC}"
    exit 1
fi

# Confirmação de segurança
echo -e "${YELLOW}⚠️  ATENÇÃO: Você está fazendo deploy para PRODUÇÃO!${NC}"
read -p "Tem certeza? (digite 'sim' para confirmar): " confirmacao

if [ "$confirmacao" != "sim" ]; then
    echo -e "${YELLOW}Deploy cancelado.${NC}"
    exit 0
fi

# Atualizar código
echo -e "${YELLOW}📥 Atualizando código...${NC}"
git pull

# Instalar dependências
echo -e "${YELLOW}📦 Instalando dependências...${NC}"
npm ci

# Build para produção
echo -e "${YELLOW}🔨 Fazendo build (modo production)...${NC}"
npm run build:prod

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
echo -e "${GREEN}🌐 Acesse: https://sistema.settesaude.com.br${NC}"
echo ""
echo -e "${YELLOW}💡 Dica: Verifique os logs com: pm2 logs crm-webhook${NC}"
