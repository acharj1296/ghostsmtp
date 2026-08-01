FROM alpine:3.19

# Install Postfix, rsyslog, and CA certificates
RUN apk add --no-cache \
    postfix \
    rsyslog \
    ca-certificates \
    tzdata

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
