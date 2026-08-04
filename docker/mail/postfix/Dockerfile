FROM alpine:3.19

# Install Postfix, rsyslog, and CA certificates
RUN apk add --no-cache \
    postfix \
    rsyslog \
    openssl \
    ca-certificates \
    tzdata

# Generate a self-signed TLS certificate for STARTTLS support
RUN mkdir -p /etc/ssl/private && \
    openssl req -new -x509 -days 3650 -nodes \
      -out /etc/ssl/certs/ssl-cert-snakeoil.pem \
      -keyout /etc/ssl/private/ssl-cert-snakeoil.key \
      -subj "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=localhost"

# Create necessary directories
RUN mkdir -p /etc/postfix /var/spool/postfix/private /var/spool/postfix/public

# Copy configs
COPY main.cf /etc/postfix/main.cf
COPY master.cf /etc/postfix/master.cf
COPY mongodb-domains.cf /etc/postfix/mongodb-domains.cf
COPY mongodb-users.cf /etc/postfix/mongodb-users.cf
COPY mongodb-aliases.cf /etc/postfix/mongodb-aliases.cf

# Set correct permissions
RUN chmod 0644 /etc/postfix/main.cf /etc/postfix/master.cf && \
    chmod 0644 /etc/postfix/mongodb-*.cf

# Start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 25 587

ENTRYPOINT ["/start.sh"]
