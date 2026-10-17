#!/usr/bin/env bash
# ==============================================================================
# Malaeb (مَلعبك) - Quick Update Script for Linux Server
# Rebuilds the frontend and reloads PM2 backend in seconds
# ==============================================================================

set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${CYAN}🔄 جاري تحديث منصة ملاعب...${NC}"

# If git repository, pull latest changes
if [ -d "${APP_DIR}/.git" ]; then
  echo -e "${YELLOW}جلب التحديثات من مستودع Git...${NC}"
  cd "${APP_DIR}"
  git pull || true
fi

# 1. Update Backend
echo -e "${YELLOW}تحديث مكتبات الباك إند...${NC}"
cd "${APP_DIR}/server"
npm install --production

# 2. Update & Build Frontend
echo -e "${YELLOW}إعادة بناء واجهة React...${NC}"
cd "${APP_DIR}/client"
npm install
npm run build

# 3. Reload PM2
echo -e "${YELLOW}إعادة تشغيل الباك إند بواسطة PM2...${NC}"
cd "${APP_DIR}/server"
pm2 restart malaeb-api || pm2 start index.js --name "malaeb-api"
pm2 save

# 4. Reload Nginx
echo -e "${YELLOW}إعادة تحميل Nginx...${NC}"
systemctl reload nginx

SERVER_IP=$(curl -s -4 ifconfig.me || curl -s -4 icanhazip.com || hostname -I | awk '{print $1}')

echo -e "\n${GREEN}✓ تم تحديث الموقع بنجاح!${NC}"
echo -e "🔗 رابط موقعك المباشر: ${CYAN}http://${SERVER_IP}/${NC}\n"
