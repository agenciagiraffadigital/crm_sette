#!/bin/bash
# Script para configurar SSL com Let's Encrypt

echo "=== CONFIGURANDO SSL ==="

# Instalar certbot se não existir
if ! command -v certbot &> /dev/null; then
    echo "Instalando certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

# Gerar certificados SSL
echo "Gerando certificado para dev.settesaude.com.br..."
sudo certbot --nginx -d dev.settesaude.com.br --non-interactive --agree-tos --email admin@settesaude.com.br

echo "Gerando certificado para sistema.settesaude.com.br..."
sudo certbot --nginx -d sistema.settesaude.com.br --non-interactive --agree-tos --email admin@settesaude.com.br

# Aplicar configuração customizada
echo "Aplicando configuração customizada do Nginx..."
sudo cp nginx-config.txt /etc/nginx/sites-available/crm_sette
sudo nginx -t && sudo systemctl reload nginx

echo "=== SSL CONFIGURADO ==="
echo "✅ https://sistema.settesaude.com.br"
echo "✅ https://dev.settesaude.com.br"