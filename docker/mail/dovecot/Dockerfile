FROM alpine:3.19

# Install Dovecot, LMTP, Curl for Auth helpers, and timezone data
RUN apk add --no-cache \
    dovecot \
    dovecot-lmtpd \
    curl \
    ca-certificates \
    tzdata

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
