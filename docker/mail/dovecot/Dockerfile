FROM alpine:3.19

# Install Dovecot, LMTP, and PostgreSQL auth modules
RUN apk add --no-cache \
    dovecot \
    dovecot-lmtpd \
    dovecot-pgsql \
    ca-certificates \
    tzdata

# Create dovecot directory and user config paths
RUN mkdir -p /etc/dovecot/conf.d /var/mail /var/run/dovecot

# Copy configs
COPY dovecot.conf /etc/dovecot/dovecot.conf
COPY dovecot-sql.conf.ext /etc/dovecot/dovecot-sql.conf.ext

# Adjust ownership
RUN chown -R root:root /etc/dovecot && \
    chmod 0644 /etc/dovecot/dovecot.conf /etc/dovecot/dovecot-sql.conf.ext

EXPOSE 24 10001

# Run Dovecot in foreground
CMD ["dovecot", "-F"]
