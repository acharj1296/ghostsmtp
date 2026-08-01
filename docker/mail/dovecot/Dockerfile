FROM alpine:3.19

# Install Dovecot, LMTP, Curl for Auth helpers, openssl to generate ssl cert, and timezone data
RUN apk add --no-cache \
    dovecot \
    dovecot-lmtpd \
    curl \
    ca-certificates \
    openssl \
    tzdata

# Create vmail user and group with UID/GID 1000
RUN addgroup -g 1000 vmail && \
    adduser -u 1000 -G vmail -S -D -H vmail

# Generate self-signed SSL certificates for Dovecot
RUN mkdir -p /etc/ssl/private && \
    openssl req -new -x509 -days 3650 -nodes \
      -out /etc/ssl/certs/ssl-cert-snakeoil.pem \
      -keyout /etc/ssl/private/ssl-cert-snakeoil.key \
      -subj "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=localhost"

# Create dovecot directory and user config paths
RUN mkdir -p /etc/dovecot /var/mail /var/run/dovecot

# Copy configs
COPY dovecot.conf /etc/dovecot/dovecot.conf
COPY auth-helper.sh /etc/dovecot/auth-helper.sh

# Adjust ownership and permissions
RUN chown -R root:root /etc/dovecot && \
    chmod 0644 /etc/dovecot/dovecot.conf && \
    chmod 0755 /etc/dovecot/auth-helper.sh

EXPOSE 24 10001

# Run Dovecot in foreground
CMD ["dovecot", "-F"]
