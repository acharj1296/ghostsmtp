#!/bin/sh
set -e

# The API container writes DKIM keys into the shared volume as root. Ensure the
# opendkim user can read them before the milter starts. Also guarantee the
# shared KeyTable/SigningTable exist (they are bind-mounted and may be empty).
mkdir -p /etc/opendkim/keys
chown -R opendkim:opendkim /etc/opendkim/keys
chmod 755 /etc/opendkim/keys

touch /etc/opendkim/KeyTable /etc/opendkim/SigningTable
chown opendkim:opendkim /etc/opendkim/KeyTable /etc/opendkim/SigningTable
chmod 0644 /etc/opendkim/KeyTable /etc/opendkim/SigningTable

echo "OpenDKIM: shared keys volume ready."

exec opendkim -f -v -x /etc/opendkim/opendkim.conf
