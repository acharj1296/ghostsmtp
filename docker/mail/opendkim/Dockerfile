FROM alpine:3.19

# Install OpenDKIM and dependencies
RUN apk add --no-cache \
    opendkim \
    tzdata

# Create necessary directories
RUN mkdir -p /etc/opendkim/keys /var/run/opendkim && \
    chown -R opendkim:opendkim /etc/opendkim /var/run/opendkim

# Copy configurations
COPY opendkim.conf /etc/opendkim/opendkim.conf
COPY SigningTable /etc/opendkim/SigningTable
COPY KeyTable /etc/opendkim/KeyTable
COPY TrustedHosts /etc/opendkim/TrustedHosts

# Set proper permissions
RUN chmod 0644 /etc/opendkim/opendkim.conf /etc/opendkim/SigningTable /etc/opendkim/KeyTable /etc/opendkim/TrustedHosts

EXPOSE 12345

# Start OpenDKIM in foreground
CMD ["opendkim", "-f", "-v", "-x", "/etc/opendkim/opendkim.conf"]
