#!/bin/bash
set -e

DOMAIN=${1:-""}
EMAIL=${2:-"admin@example.com"}

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain> [email]"
    echo "Example: $0 elevator.example.com admin@example.com"
    echo ""
    echo "For local/dev setup without a domain, generate a self-signed cert:"
    echo "  mkdir -p nginx/ssl"
    echo "  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\"
    echo "    -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem \\"
    echo "    -subj '/CN=elevator.local'"
    exit 1
fi

mkdir -p nginx/ssl

if command -v certbot &> /dev/null; then
    echo "Obtaining Let's Encrypt certificate for $DOMAIN..."
    sudo certbot certonly --standalone -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive

    sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" nginx/ssl/cert.pem
    sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" nginx/ssl/key.pem
    sudo chown -R "$(whoami)" nginx/ssl/

    echo "Certificates obtained. Set up auto-renewal:"
    echo "  sudo certbot renew --deploy-hook 'cp ...'"
else
    echo "certbot not found. Generating self-signed certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem \
        -subj "/CN=$DOMAIN"
    echo "Self-signed certificate generated for $DOMAIN"
fi

echo "SSL setup complete."
echo "  cert: nginx/ssl/cert.pem"
echo "  key:  nginx/ssl/key.pem"
