#!/bin/sh

set -e

# Default values
MAIL_HOSTNAME=${MAIL_HOSTNAME:-mail.ghosthosting.qzz.io}
MAIL_DOMAIN=${MAIL_DOMAIN:-ghosthosting.qzz.io}
# Overlay subnet of the dedicated mail network (fail-closed: loopback only if unset)
RELAY_NETWORK=${RELAY_NETWORK:-}

echo "======================================"
echo "Configuring Postfix..."
echo "Hostname : $MAIL_HOSTNAME"
echo "Domain   : $MAIL_DOMAIN"
echo "RelayNet : ${RELAY_NETWORK:-<none — loopback only>}"
echo "======================================"

# Configure Postfix dynamically
postconf -e "myhostname = $MAIL_HOSTNAME"
postconf -e "mydomain = $MAIL_DOMAIN"
postconf -e "myorigin = \$mydomain"
postconf -e "mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128 ${RELAY_NETWORK}"

# Fix permissions
chown -R postfix:postfix /var/spool/postfix

# Generate aliases
newaliases

# Start rsyslog
rsyslogd

echo "Starting Postfix..."
exec postfix start-fg