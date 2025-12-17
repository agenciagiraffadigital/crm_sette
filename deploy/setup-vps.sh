#!/bin/bash

# Script para configurar VPS inicial
echo "🚀 Configurando VPS para CRM Sette..."

# Variáveis
DOMAIN="sistema.settesaude.com.br"
PROJECT_PATH="/var/www/crm_sette"

# Copiar configuração nginx
echo "📝 Configurando nginx..."
sudo cp $PROJECT_PATH/deploy/nginx.conf /etc/nginx/sites-available/crm-sette
sudo ln -sf /etc/nginx/sites-available/crm-sette /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração nginx
sudo nginx -t

# Instalar dependências do projeto
echo "📦 Instalando dependências..."
cd $PROJECT_PATH
npm ci --production

# Build inicial
echo "🔨 Fazendo build inicial..."
npm run build

# Configurar PM2
echo "⚙️ Configurando PM2..."
pm2 delete crm-webhook 2>/dev/null || true
pm2 start server/index.cjs --name "crm-webhook"
pm2 startup
pm2 save

# Recarregar nginx
echo "🔄 Recarregando nginx..."
sudo systemctl reload nginx

# Configurar SSL (opcional)
echo "🔒 Para configurar SSL, execute:"
echo "sudo certbot --nginx -d $DOMAIN"

echo "✅ Setup concluído!"
echo "🌐 Acesse: http://$DOMAIN"
echo "📊 Health check: http://$DOMAIN/health"