#!/usr/bin/env bash
# ==============================================================================
# Malaeb (مَلعبك) - Production Deployment Script for Linux Server (Coexists with Existing Websites)
# Access your site via server IP on a dedicated port (Default: 8080)
# Example: http://<SERVER_IP>:8080/
# ==============================================================================

set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=================================================================${NC}"
echo -e "${GREEN}   ⚽ منصة ملاعب - سكربت النشر الآمن (يدعم وجود مواقع سابقة)     ${NC}"
echo -e "${CYAN}=================================================================${NC}"

# Check root permissions
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}❌ يرجى تشغيل السكربت بصلاحيات root أو باستخدام sudo:${NC}"
  echo -e "   sudo bash deploy.sh [PORT]"
  exit 1
fi

# 1. Determine Port (Default: 8080 to avoid clashing with existing sites on port 80/443)
SITE_PORT="${1:-8080}"
echo -e "${YELLOW}📌 المنفذ المخصص للموقع: ${GREEN}${SITE_PORT}${NC}"
echo -e "${CYAN}ℹ️  لن يتم المساس بأي موقع موجود مسبقاً على السيرفر (Port 80 / 443).${NC}"

# Detect Server IP
SERVER_IP=$(curl -s -4 ifconfig.me || curl -s -4 icanhazip.com || hostname -I | awk '{print $1}')
echo -e "${YELLOW}🌐 عنوان IP الخاص بالسيرفر: ${GREEN}${SERVER_IP}${NC}"

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "${YELLOW}📂 مسار مجلد المشروع: ${CYAN}${APP_DIR}${NC}"

# 2. Update system packages & install prerequisites
echo -e "\n${CYAN}[1/7] فحص وتثبيت المتطلبات الأساسية...${NC}"
apt-get update -y
apt-get install -y curl wget git ufw nginx mysql-server build-essential

# 3. Check and install Node.js 20 LTS
echo -e "\n${CYAN}[2/7] التحقق من Node.js و PM2...${NC}"
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 18 ]; then
  echo -e "${YELLOW}تثبيت Node.js 20 LTS...${NC}"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo -e "${GREEN}✓ Node.js $(node -v) مثبت${NC}"

if ! command -v pm2 &> /dev/null; then
  echo -e "${YELLOW}تثبيت PM2 لإدارة عمليات Node.js...${NC}"
  npm install -g pm2
fi

# 4. Setup MySQL Database
echo -e "\n${CYAN}[3/7] إعداد قاعدة بيانات MySQL...${NC}"
systemctl enable --now mysql

DB_NAME="malaeb_db"
DB_USER="malaeb_user"
DB_PASS="Malaeb_$(openssl rand -hex 8)_Pass!"

# Try logging into MySQL with socket or prompt if needed
MYSQL_CMD="mysql"
if ! mysql -e "SELECT 1;" &>/dev/null; then
  if mysql -u root -e "SELECT 1;" &>/dev/null; then
    MYSQL_CMD="mysql -u root"
  else
    echo -e "${YELLOW}⚠️  يرجى إدخال كلمة مرور مستخدم root لـ MySQL (أو اضغط Enter إذا لم تكن هناك كلمة مرور):${NC}"
    read -s -p "MySQL Root Password: " ROOT_MYSQL_PW
    echo ""
    if [ -n "$ROOT_MYSQL_PW" ]; then
      MYSQL_CMD="mysql -u root -p${ROOT_MYSQL_PW}"
    else
      MYSQL_CMD="mysql -u root"
    fi
  fi
fi

$MYSQL_CMD <<EOF
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
ALTER USER '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
EOF

echo -e "${GREEN}✓ تم إعداد قاعدة البيانات بنجاح: ${DB_NAME}${NC}"

# 5. Configure Backend (.env)
echo -e "\n${CYAN}[4/7] حفظ إعدادات الاتصال في server/.env...${NC}"
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

# 6. Install dependencies and build
echo -e "\n${CYAN}[5/7] تثبيت التبعيات وبناء واجهة React...${NC}"
cd "${APP_DIR}/server"
npm install --production

cd "${APP_DIR}/client"
npm install
npm run build
echo -e "${GREEN}✓ تم بناء ملفات الفرونت إند بنجاح في client/dist${NC}"

# 7. Configure Nginx on Dedicated Port (Completely isolated from existing sites)
echo -e "\n${CYAN}[6/7] ضبط Nginx على المنفذ المخصص ${SITE_PORT} بدون التأثير على المواقع الأخرى...${NC}"

cat > /etc/nginx/sites-available/malaeb.conf <<EOF
server {
    listen ${SITE_PORT};
    listen [::]:${SITE_PORT};
    server_name _;

    root ${APP_DIR}/client/dist;
    index index.html;

    client_max_body_size 50M;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
        try_files \$uri =404;
    }

    # API Proxy to Node.js Backend on port 5000
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
systemctl reload nginx

# 8. Start with PM2 and open firewall port
echo -e "\n${CYAN}[7/7] تشغيل السيرفر وفتح المنفذ ${SITE_PORT} في الجدار الناري...${NC}"
cd "${APP_DIR}/server"
pm2 delete malaeb-api 2>/dev/null || true
pm2 start index.js --name "malaeb-api"
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# Allow dedicated port in UFW without closing existing ports
ufw allow ${SITE_PORT}/tcp || true

echo -e "\n${CYAN}=================================================================${NC}"
echo -e "${GREEN}🎉 تم نشر وتشغيل المنصة بنجاح دون أي تعارض مع موقعك السابق!${NC}"
echo -e "${CYAN}=================================================================${NC}"
echo -e "🔗 رابط موقعك المباشر:   ${YELLOW}http://${SERVER_IP}:${SITE_PORT}/${NC}"
echo -e "🩺 فحص الـ API:           ${YELLOW}http://${SERVER_IP}:${SITE_PORT}/api/health${NC}"
echo -e "📊 حالة السيرفر:          ${CYAN}pm2 status${NC}"
echo -e "📜 سجلات النظام:          ${CYAN}pm2 logs malaeb-api${NC}"
echo -e "${CYAN}=================================================================${NC}"
