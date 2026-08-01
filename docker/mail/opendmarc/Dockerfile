FROM alpine:3.19

# Install OpenDMARC and dependencies
RUN apk add --no-cache \
    opendmarc \
    tzdata

# Create opendmarc group and user if they don't exist
RUN addgroup -S opendmarc 2>/dev/null || true && \
    adduser -S -G opendmarc opendmarc 2>/dev/null || true

# Create necessary directories
RUN mkdir -p /var/run/opendmarc && \
    chown -R opendmarc:opendmarc /var/run/opendmarc

# Copy configurations
COPY opendmarc.conf /etc/opendmarc/opendmarc.conf

# Set proper permissions
RUN chmod 0644 /etc/opendmarc/opendmarc.conf

EXPOSE 54321

# Start OpenDMARC in foreground
CMD ["opendmarc", "-f", "-c", "/etc/opendmarc/opendmarc.conf"]
