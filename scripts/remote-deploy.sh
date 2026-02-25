#!/bin/bash

# Script para fazer deploy remoto (executar da sua máquina local)
# Uso: bash scripts/remote-deploy.sh [dev|prod]

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar argumento
if [ -z "$1" ]; then
    echo -e "${RED}❌ Erro: Especifique o ambiente (dev ou prod)${NC}"
    echo "Uso: bash scripts/remote-deploy.sh [dev|prod]"
    exit 1
fi

ENV=$1

# Configurar variáveis baseado no ambiente
if [ "$ENV" == "dev" ]; then
    SERVER="usuario@dev.settesaude.com.br"
    PROJECT_PATH="/var/www/crm_sette"
    URL="https://dev.settesaude.com.br"
    BUILD_CMD="build:dev"
elif [ "$ENV" == "prod" ]; then
    SERVER="usuario@sistema.settesaude.com.br"
    PROJECT_PATH="/var/www/crm_sette"
    URL="https://sistema.settesaude.com.br"
    BUILD_CMD="build:prod"
    
    # Confirmação extra para produção
    echo -e "${YELLOW}⚠️  ATENÇÃO: Você está fazendo deploy para PRODUÇÃO!${NC}"
    read -p "Tem certeza? (digite 'sim' para confirmar): " confirmacao
    
    if [ "$confirmacao" != "sim" ]; then
        echo -e "${YELLOW}Deploy cancelado.${NC}"
        exit 0
    fi
else
    echo -e "${RED}❌ Erro: Ambiente inválido. Use 'dev' ou 'prod'${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Iniciando deploy para ${ENV^^}...${NC}"
echo ""

# Função para executar comando remoto
remote_exec() {
    ssh $SERVER "cd $PROJECT_PATH && $1"
}

# 1. Verificar conexão
echo -e "${YELLOW}📡 Verificando conexão com servidor...${NC}"
if ! ssh -q $SERVER exit; then
    echo -e "${RED}❌ Erro: Não foi possível conectar ao servidor${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Conexão OK${NC}"
echo ""

# 2. Atualizar código
echo -e "${YELLOW}📥 Atualizando código...${NC}"
remote_exec "git pull"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao atualizar código${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Código atualizado${NC}"
echo ""

# 3. Instalar dependências
echo -e "${YELLOW}📦 Instalando dependências...${NC}"
if [ "$ENV" == "prod" ]; then
    remote_exec "npm ci --production"
else
    remote_exec "npm ci"
fi
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao instalar dependências${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dependências instaladas${NC}"
echo ""

# 4. Verificar configuração
echo -e "${YELLOW}🔍 Verificando configuração...${NC}"
remote_exec "npm run check:env:${ENV}"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro na configuração de ambiente${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Configuração OK${NC}"
echo ""

# 5. Fazer build
echo -e "${YELLOW}🔨 Fazendo build (${BUILD_CMD})...${NC}"
remote_exec "npm run ${BUILD_CMD}"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro no build${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build concluído${NC}"
echo ""

# 6. Reiniciar servidor
echo -e "${YELLOW}🔄 Reiniciando servidor...${NC}"
remote_exec "pm2 restart crm-webhook"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao reiniciar servidor${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Servidor reiniciado${NC}"
echo ""

# 7. Verificar status
echo -e "${YELLOW}📊 Verificando status...${NC}"
remote_exec "pm2 status crm-webhook"
echo ""

# 8. Mostrar logs recentes
echo -e "${YELLOW}📝 Últimas linhas do log:${NC}"
remote_exec "pm2 logs crm-webhook --lines 20 --nostream"
echo ""

# Sucesso
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}🌐 URL: ${URL}${NC}"
echo ""
echo -e "${YELLOW}💡 Dicas:${NC}"
echo "   - Teste o sistema no navegador"
echo "   - Monitore os logs: ssh $SERVER 'pm2 logs crm-webhook'"
echo "   - Verifique o status: ssh $SERVER 'pm2 status'"
echo ""

# Perguntar se quer abrir no navegador
read -p "Deseja abrir o sistema no navegador? (s/n): " open_browser
if [ "$open_browser" == "s" ] || [ "$open_browser" == "S" ]; then
    if command -v xdg-open &> /dev/null; then
        xdg-open "$URL"
    elif command -v open &> /dev/null; then
        open "$URL"
    else
        echo "Abra manualmente: $URL"
    fi
fi
