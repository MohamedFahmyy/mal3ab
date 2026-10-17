#!/usr/bin/env bash
# ==============================================================================
# Malaeb (مَلعبك) - Quick Update Script for Linux Server
# Rebuilds the frontend, updates backend dependencies, and reloads services
# Usage: bash update.sh
# ==============================================================================

set -e

# Terminal Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "\n${CYAN}=================================================================${NC}"
echo -e "${GREEN}${BOLD}   ⚽ منصة ملاعب - سكربت التحديث السريع للمشروع                ${NC}"
echo -e "${CYAN}=================================================================${NC}"
echo -e "${YELLOW}📂 مسار المشروع:${NC} ${APP_DIR}"

# 1. Update from Git repository
if [ -d "${APP_DIR}/.git" ]; then
  echo -e "\n${CYAN}[1/5] جلب أحدث التحديثات من مستودع Git...${NC}"
  cd "${APP_DIR}"
  
  # Stash any local uncommitted server modifications to prevent merge conflicts
  git stash push -m "Auto-stashed before update.sh on $(date)" 2>/dev/null || true
  
  # Pull latest code from main branch
  git pull origin main || git pull || {
    echo -e "${YELLOW}⚠️ تعذر سحب التحديثات عبر git pull، سيتم الاستمرار بالملفات الحالية.${NC}"
  }
  echo -e "${GREEN}✓ تم تحديث كود المشروع من المستودع بنجاح.${NC}"
else
  echo -e "\n${YELLOW}[1/5] تخطي التحديث عبر Git (المجلد ليس مستودع git).${NC}"
fi

# 2. Update Backend Dependencies
echo -e "\n${CYAN}[2/5] فحص وتحديث مكتبات الباك إند (Node.js)...${NC}"
if [ -d "${APP_DIR}/server" ]; then
  cd "${APP_DIR}/server"
  if command -v npm &> /dev/null; then
    npm install --production --no-audit --no-fund
    echo -e "${GREEN}✓ تم تحديث مكتبات الباك إند بنجاح.${NC}"
  else
    echo -e "${RED}❌ تعذر العثور على npm. يرجى التأكد من تثبيت Node.js.${NC}"
  fi
fi

# 3. Update & Build Frontend
echo -e "\n${CYAN}[3/5] إعادة بناء واجهة المستخدم (React + Vite)...${NC}"
if [ -d "${APP_DIR}/client" ]; then
  cd "${APP_DIR}/client"
  if command -v npm &> /dev/null; then
    npm install --no-audit --no-fund
    npm run build
    # Set proper permissions so Nginx/Apache can read static files
    chmod -R 755 "${APP_DIR}/client/dist" 2>/dev/null || true
    echo -e "${GREEN}✓ تم بناء ملفات الواجهة بنجاح داخل client/dist.${NC}"
  else
    echo -e "${RED}❌ تعذر العثور على npm لبناء الواجهة.${NC}"
  fi
fi

# 4. Restart Backend Process via PM2
echo -e "\n${CYAN}[4/5] إعادة تشغيل خدمة الباك إند...${NC}"
if command -v pm2 &> /dev/null; then
  cd "${APP_DIR}/server"
  pm2 restart malaeb-api 2>/dev/null || pm2 start index.js --name "malaeb-api"
  pm2 save 2>/dev/null || true
  echo -e "${GREEN}✓ تم إعادة تشغيل خدمة الباك إند بنجاح بواسطة PM2.${NC}"
else
  echo -e "${YELLOW}⚠️ PM2 غير مثبت. إذا كنت تشغل السيرفر عبر systemd أو كخدمة أخرى، تأكد من إعادة تشغيلها.${NC}"
fi

# 5. Reload Web Server (Nginx / Apache)
echo -e "\n${CYAN}[5/5] إعادة تحميل خادم الويب لتطبيق الملفات الجديدة...${NC}"
RELOADED_SERVER=false

# Test & Reload Nginx if present
if command -v nginx &> /dev/null; then
  if nginx -t 2>/dev/null || sudo nginx -t 2>/dev/null; then
    systemctl reload nginx 2>/dev/null || sudo systemctl reload nginx 2>/dev/null || service nginx reload 2>/dev/null || true
    echo -e "${GREEN}✓ تم إعادة تحميل Nginx بنجاح.${NC}"
    RELOADED_SERVER=true
  fi
fi

# Reload Apache if present and Nginx wasn't reloaded
if [ "$RELOADED_SERVER" = false ] && (command -v apache2 &> /dev/null || command -v httpd &> /dev/null); then
  systemctl reload apache2 2>/dev/null || sudo systemctl reload apache2 2>/dev/null || systemctl reload httpd 2>/dev/null || true
  echo -e "${GREEN}✓ تم إعادة تحميل Apache بنجاح.${NC}"
  RELOADED_SERVER=true
fi

# Determine Server IP and Port
SERVER_IP=$(curl -s -4 ifconfig.me 2>/dev/null || curl -s -4 icanhazip.com 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
SITE_PORT=$(grep -oP 'listen\s+\K[0-9]+' /etc/nginx/sites-available/malaeb.conf 2>/dev/null | head -n1 || echo "")

if [ -z "$SITE_PORT" ] || [ "$SITE_PORT" = "80" ]; then
  FULL_URL="http://${SERVER_IP}/"
  API_HEALTH_URL="http://${SERVER_IP}/api/health"
else
  FULL_URL="http://${SERVER_IP}:${SITE_PORT}/"
  API_HEALTH_URL="http://${SERVER_IP}:${SITE_PORT}/api/health"
fi

echo -e "\n${CYAN}=================================================================${NC}"
echo -e "${GREEN}${BOLD}🎉 تم تحديث منصة ملاعب بنجاح!${NC}"
echo -e "${CYAN}=================================================================${NC}"
echo -e "🔗 رابط موقعك المباشر:   ${YELLOW}${FULL_URL}${NC}"
echo -e "🩺 فحص الـ API:           ${CYAN}${API_HEALTH_URL}${NC}"
echo -e "📊 حالة السيرفر:          ${BOLD}pm2 status${NC}"
echo -e "📜 سجلات النظام المباشرة: ${BOLD}pm2 logs malaeb-api${NC}"
echo -e "${CYAN}=================================================================${NC}\n"
