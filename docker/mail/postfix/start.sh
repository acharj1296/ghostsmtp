#!/bin/sh

set -e

# Default values
MAIL_HOSTNAME=${MAIL_HOSTNAME:-mail.ghosthosting.qzz.io}
MAIL_DOMAIN=${MAIL_DOMAIN:-ghosthosting.qzz.io}

echo "======================================"
echo "Configuring Postfix..."
echo "Hostname : $MAIL_HOSTNAME"
echo "Domain   : $MAIL_DOMAIN"
echo "======================================"

# Configure Postfix dynamically
postconf -e "myhostname = $MAIL_HOSTNAME"
postconf -e "mydomain = $MAIL_DOMAIN"
postconf -e "myorigin = \$mydomain"

# Fix permissions
chown -R postfix:postfix /var/spool/postfix

# Generate aliases
newaliases

# Start rsyslog
rsyslogd

echo "Starting Postfix..."
exec postfix start-fg