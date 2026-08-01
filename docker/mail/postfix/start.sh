#!/bin/sh

# Ensure spool directories have correct ownership
chown -R postfix:postfix /var/spool/postfix

# Re-generate aliases database
newaliases

# Start system logger in background so we get mail logs
rsyslogd

# Start Postfix in foreground
echo "Starting Postfix mail server..."
exec postfix start-fg
