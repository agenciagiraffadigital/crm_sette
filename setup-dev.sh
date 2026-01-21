#!/bin/bash
# Script para configurar ambiente de desenvolvimento
# Execute no servidor VPS como root

echo "=== CONFIGURANDO AMBIENTE DE DESENVOLVIMENTO ==="

# 1. Instalar serve globalmente se não existir
if ! command -v serve &> /dev/null; then
    echo "Instalando serve..."
    npm install -g serve
fi

# 2. Configurar ambiente de desenvolvimento
cd /var/www/crm_sette_dev

# 3. Build do projeto
echo "Fazendo build do projeto..."
npm run build

# 4. Iniciar servidor de desenvolvimento na porta 3001
echo "Iniciando servidor de desenvolvimento..."
pm2 delete crm-webhook-dev 2>/dev/null || true
pm2 start "serve dist -p 3001" --name crm-webhook-dev
pm2 save

# 5. Verificar se está rodando
pm2 status

echo "=== AMBIENTE DE DESENVOLVIMENTO CONFIGURADO ==="
echo "Produção: sistema.settesaude.com.br (porta 3000)"
echo "Desenvolvimento: dev.settesaude.com.br (porta 3001)"
echo ""
echo "Para aplicar configuração do Nginx:"
echo "sudo cp nginx-config.txt /etc/nginx/sites-available/crm_sette"
echo "sudo systemctl reload nginx"