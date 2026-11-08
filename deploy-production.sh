#!/bin/bash
# ChartSignl Production Deployment Script
# Deploys backend and frontend to production VPS

set -e

# Configuration
SERVER="root@167.88.43.61"
BACKEND_PATH="/root/ChartSignl"
WEB_PATH="/srv/chartsignl-web"
LOCAL_PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting ChartSignl Production Deployment${NC}"
echo ""

# Step 1: Sync backend code to server
echo -e "${YELLOW}Step 1: Syncing backend code to server...${NC}"
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '.expo' \
  --exclude 'android' \
  --exclude 'apps/mobile/.expo' \
  --exclude 'apps/mobile/dist' \
  --exclude 'apps/mobile/node_modules' \
  --exclude 'apps/backend/node_modules' \
  --exclude 'apps/backend/dist' \
  --exclude 'packages/core/node_modules' \
  "${LOCAL_PROJECT_ROOT}/" "${SERVER}:${BACKEND_PATH}/"

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to sync code to server${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Code synced${NC}"
echo ""

# Step 2: Rebuild and restart backend Docker container
echo -e "${YELLOW}Step 2: Rebuilding and restarting backend Docker container...${NC}"
ssh "${SERVER}" << 'ENDSSH'
set -e
cd /root/ChartSignl/apps/backend/deploy

# Load environment variables from .env if it exists
if [ -f ../../../.env ]; then
  export $(cat ../../../.env | grep -v '^#' | xargs)
fi

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down || true

# Rebuild and start
echo "Building and starting containers..."
docker-compose up -d --build

# Wait a moment for container to start
sleep 5

# Check container status
echo "Checking container status..."
docker-compose ps

# Check health
echo "Checking backend health..."
sleep 3
if curl -f http://localhost:4000/health > /dev/null 2>&1; then
  echo "✅ Backend is healthy"
else
  echo "⚠️  Backend health check failed, but container is running"
fi
ENDSSH

echo -e "${GREEN}✅ Backend deployed${NC}"
echo ""

# Step 3: Build web frontend locally
echo -e "${YELLOW}Step 3: Building web frontend...${NC}"
cd "${LOCAL_PROJECT_ROOT}/apps/mobile"

# Check if .env exists
if [ ! -f .env ]; then
  echo -e "${RED}❌ No .env file found in apps/mobile/${NC}"
  echo "The .env file is required for building the web app with correct environment variables."
  echo "Please create apps/mobile/.env with EXPO_PUBLIC_* variables before deploying."
  exit 1
fi

echo -e "${GREEN}✓ .env file found${NC}"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
  fi
fi

# Build web app
echo "Building Expo web app..."
npm run build:web

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
fi

if [ ! -d "dist" ]; then
  echo -e "${RED}❌ Build failed - dist directory not found${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Web app built${NC}"
echo ""

# Step 4: Deploy web build to server
echo -e "${YELLOW}Step 4: Deploying web app to server...${NC}"
ssh "${SERVER}" "mkdir -p ${WEB_PATH}"

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to create web directory on server${NC}"
  exit 1
fi

rsync -avz --delete \
  "${LOCAL_PROJECT_ROOT}/apps/mobile/dist/" "${SERVER}:${WEB_PATH}/"

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to sync web files to server${NC}"
  exit 1
fi

# Set proper permissions for web server
echo "Setting permissions..."
ssh "${SERVER}" "chmod -R 755 ${WEB_PATH}"

if [ $? -ne 0 ]; then
  echo -e "${YELLOW}⚠️  Warning: Failed to set permissions, but files were deployed${NC}"
fi

echo -e "${GREEN}✅ Web app deployed${NC}"
echo ""

# Final summary
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "Backend: ${SERVER}:${BACKEND_PATH}"
echo "Web App: ${SERVER}:${WEB_PATH}"
echo ""
echo "Backend should be running on port 4000"
echo "Web app should be served from ${WEB_PATH}"
