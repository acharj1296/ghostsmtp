FROM alpine:3.19

# Install Postfix, Postgrey, PostgreSQL driver, rsyslog, and CA certificates
RUN apk add --no-cache \
    postfix \
    postfix-pgsql \
    rsyslog \
    ca-certificates \
    tzdata

# Create necessary directories
RUN mkdir -p /etc/postfix/sql /var/spool/postfix/private /var/spool/postfix/public

# Copy configurations
COPY main.cf /etc/postfix/main.cf
COPY master.cf /etc/postfix/master.cf
COPY sql/ /etc/postfix/sql/

# Set correct permissions
RUN chmod 0644 /etc/postfix/main.cf /etc/postfix/master.cf && \
    chmod -R 0640 /etc/postfix/sql/

# Start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 25 587

ENTRYPOINT ["/start.sh"]
