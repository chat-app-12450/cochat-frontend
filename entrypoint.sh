#!/bin/sh
set -eu

APP_API_URL="${APP_API_URL:?APP_API_URL is required}"
APP_WS_URL="${APP_WS_URL:?APP_WS_URL is required}"
APP_DEBUG="${APP_DEBUG:-false}"

cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.__APP_CONFIG__ = {
  API_URL: "${APP_API_URL}",
  WS_URL: "${APP_WS_URL}",
  DEBUG: "${APP_DEBUG}"
};
EOF

exec nginx -g 'daemon off;'
