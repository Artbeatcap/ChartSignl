#!/bin/bash
# ChartSignl Deployment Script for Hostinger VPS
# Run this on your VPS after uploading the code

set -e

echo "🚀 Deploying ChartSignl..."

# Configuration
APP_DIR="/srv/chartsignl"
WEB_DIR="/var/www/chartsignl-web"
BACKEND_PORT=4000

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root or with sudo"
    exit 1
fi

echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"
apt update
apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx

# Enable Docker
systemctl enable docker
systemctl start docker

echo -e "${YELLOW}Step 2: Setting up directories...${NC}"
mkdir -p $APP_DIR
mkdir -p $WEB_DIR

echo -e "${YELLOW}Step 3: Building and starting backend...${NC}"
cd $APP_DIR

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env << 'EOF'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-your-openai-key
CORS_ORIGINS=https://charts.yourdomain.com
NODE_ENV=production
PORT=4000
EOF
    echo -e "${YELLOW}⚠️  Please edit .env with your actual credentials!${NC}"
    echo "Edit file: $APP_DIR/.env"
fi

# Build and start with Docker Compose
cd apps/backend/deploy
docker-compose down || true
docker-compose up -d --build

echo -e "${YELLOW}Step 4: Setting up Nginx...${NC}"
# Copy Nginx configs
cp nginx-api.conf /etc/nginx/sites-available/charts-api.conf
cp nginx-web.conf /etc/nginx/sites-available/levels-web.conf

# Enable sites
ln -sf /etc/nginx/sites-available/charts-api.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/levels-web.conf /etc/nginx/sites-enabled/

# Test and reload Nginx
nginx -t
systemctl reload nginx

echo -e "${YELLOW}Step 5: Setting up SSL (Let's Encrypt)...${NC}"
echo "Run these commands manually with your domain:"
echo "  certbot --nginx -d charts-api.yourdomain.com"
echo "  certbot --nginx -d charts.yourdomain.com"

echo -e "${GREEN}✅ Backend deployed!${NC}"
echo ""
echo "Next steps:"
echo "1. Edit $APP_DIR/.env with your credentials"
echo "2. Update domain names in Nginx configs"
echo "3. Run certbot for SSL certificates"
echo "4. Deploy web app: upload Expo web build to $WEB_DIR"
echo ""
echo "API endpoint: https://charts-api.yourdomain.com"
echo "Web app: https://charts.yourdomain.com"
