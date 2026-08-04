#!/bin/sh
set -e

# Activates the appropriate edge config without writing into the host bind
# mount: repo templates are mounted at /etc/nginx/conf.d.templates (read-only)
# and the active file is copied into the container-local /etc/nginx/conf.d.
if [ "$SSL_ENABLED" = "true" ]; then
  if [ ! -f /etc/nginx/certs/fullchain.pem ] || [ ! -f /etc/nginx/certs/privkey.pem ]; then
    echo "SSL_ENABLED=true but certificates are missing at /etc/nginx/certs/."
    echo "Mount fullchain.pem and privkey.pem, or set SSL_ENABLED=false. Refusing to start."
    exit 1
  fi
  echo "nginx: activating TLS config (HTTP -> HTTPS on 443)."
  cp /etc/nginx/conf.d.templates/ssl.conf /etc/nginx/conf.d/default.conf
else
  echo "nginx: activating plain HTTP config (port 80)."
  cp /etc/nginx/conf.d.templates/default.conf /etc/nginx/conf.d/default.conf
fi

exec nginx -g 'daemon off;'
