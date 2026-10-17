#!/usr/bin/env bash
# ==============================================================================
# Malaeb (مَلعبك) - Production Deployment Script for Linux Server (No Domain Required)
# Compatible with Ubuntu 20.04 / 22.04 / 24.04 & Debian 11 / 12
# Access your site directly via your server IP: http://<SERVER_IP>
# ==============================================================================

set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=====================================================${NC}"
echo -e "${GREEN}   ⚽ منصة ملاعب - سكربت النشر التلقائي لسيرفر لينكس   ${NC}"
echo -e "${CYAN}=====================================================${NC}"

# Check if script is run as root or with sudo
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ يرجى تشغيل السكربت بصلاحيات root أو باستخدام sudo:${NC}"
  echo -e "   sudo bash deploy.sh"
  exit 1
fi

# Detect Server IP
SERVER_IP=$(curl -s -4 ifconfig.me || curl -s -4 icanhazip.com || hostname -I | awk '{print $1}')
echo -e "${YELLOW}🌐 تم اكتشاف عنوان IP الخاص بالسيرفر: ${GREEN}${SERVER_IP}${NC}"

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "${YELLOW}📂 مسار مجلد المشروع: ${CYAN}${APP_DIR}${NC}"

# 1. Update system packages
echo -e "\n${CYAN}[1/7] تحديث حزم النظام وتثبيت المتطلبات الأساسية...${NC}"
apt-get update -y
apt-get install -y curl wget git ufw nginx mysql-server build-essential

# 2. Install Node.js LTS (Node 20)
echo -e "\n${CYAN}[2/7] التحقق من Node.js وتثبيت أحدث إصدار LTS...${NC}"
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 18 ]; then
  echo -e "${YELLOW}جاري تثبيت Node.js 20 LTS...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo -e "${GREEN}✓ Node.js $(node -v) مثبت بنجاح${NC}"
echo -e "${GREEN}✓ NPM v$(npm -v) مثبت بنجاح${NC}"

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
  echo -e "${YELLOW}جاري تثبيت PM2 لإدارة عمليات Node.js بالخلفية...${NC}"
  npm install -g pm2
fi

# 3. Setup MySQL Database & User
echo -e "\n${CYAN}[3/7] إعداد وتأمين قاعدة بيانات MySQL...${NC}"
systemctl enable --now mysql

DB_NAME="malaeb_db"
DB_USER="malaeb_user"
# Generate secure random password
DB_PASS="Malaeb_$(openssl rand -hex 8)_Pass!"

echo -e "${YELLOW}إنشاء قاعدة البيانات والمستخدم المحلي...${NC}"
mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
EOF

echo -e "${GREEN}✓ تم إنشاء قاعدة البيانات: ${DB_NAME}${NC}"
echo -e "${GREEN}✓ اسم المستخدم: ${DB_USER}${NC}"

# 4. Configure Backend Environment (.env)
echo -e "\n${CYAN}[4/7] إنشاء ملف متغيرات البيئة للباك إند (server/.env)...${NC}"
cat > "${APP_DIR}/server/.env" <<EOF
PORT=5000
NODE_ENV=production
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASS}
DB_NAME=${DB_NAME}
EOF
chmod 600 "${APP_DIR}/server/.env"
echo -e "${GREEN}✓ تم حفظ بيانات الاتصال بأمان في server/.env${NC}"

# 5. Install Dependencies and Build Application
echo -e "\n${CYAN}[5/7] تثبيت التبعيات وبناء واجهة React...${NC}"
# Backend dependencies
cd "${APP_DIR}/server"
npm install --production

# Frontend dependencies & production build
cd "${APP_DIR}/client"
npm install
npm run build

echo -e "${GREEN}✓ تم بناء ملفات الفرونت إند بنجاح في client/dist${NC}"

# 6. Configure Nginx (Reverse Proxy + Static Hosting for IP)
echo -e "\n${CYAN}[6/7] ضبط خادم Nginx لتشغيل الموقع مباشرة عبر الـ IP...${NC}"

# Remove default site if exists
if [ -f /etc/nginx/sites-enabled/default ]; then
  rm -f /etc/nginx/sites-enabled/default
fi

# Create Nginx configuration
cat > /etc/nginx/sites-available/malaeb.conf <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root ${APP_DIR}/client/dist;
    index index.html;

    client_max_body_size 50M;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
        try_files \$uri =404;
    }

    # Reverse proxy API requests to Node.js backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 90;
    }

    # SPA Router fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/malaeb.conf /etc/nginx/sites-enabled/malaeb.conf
nginx -t
systemctl restart nginx

# 7. Start/Restart Node.js API with PM2 & Configure Firewall
echo -e "\n${CYAN}[7/7] تشغيل السيرفر بواسطة PM2 وضبط الجدار الناري...${NC}"
cd "${APP_DIR}/server"
pm2 delete malaeb-api 2>/dev/null || true
pm2 start index.js --name "malaeb-api"
pm2 save
pm2 startup systemd -u root --hp /root || true

# Setup UFW firewall
ufw allow OpenSSH || ufw allow 22/tcp || true
ufw allow 'Nginx Full' || ufw allow 80/tcp || true
ufw --force enable || true

echo -e "\n${CYAN}=====================================================${NC}"
echo -e "${GREEN}🎉 تم نشر وتشغيل المنصة بنجاح على السيرفر!${NC}"
echo -e "${CYAN}=====================================================${NC}"
echo -e "🔗 رابط موقعك المباشر:  ${YELLOW}http://${SERVER_IP}/${NC}"
echo -e "🩺 فحص حالة الـ API:     ${YELLOW}http://${SERVER_IP}/api/health${NC}"
echo -e "📊 فحص حالة الخادم:     ${CYAN}pm2 status${NC}"
echo -e "📜 سجلات الخادم المباشرة: ${CYAN}pm2 logs malaeb-api${NC}"
echo -e "${CYAN}=====================================================${NC}"
