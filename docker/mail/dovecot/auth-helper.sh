#!/bin/sh

# Read password from FD 3
read -r password <&3

# If username or password is empty, exit with failure
if [ -z "$USER" ] || [ -z "$password" ]; then
  exit 1
fi

# Internal cross-service token (must match INTERNAL_AUTH_TOKEN provisioned to the API)
INTERNAL_AUTH_TOKEN=${INTERNAL_AUTH_TOKEN:-}
if [ -z "$INTERNAL_AUTH_TOKEN" ]; then
  echo "auth-helper: INTERNAL_AUTH_TOKEN is not configured; refusing to authenticate." >&2
  exit 1
fi

# Query Express Backend via HTTP POST
response=$(curl -s -w "%{http_code}" -o /tmp/auth_resp.json \
  -H "Content-Type: application/json" \
  -H "x-internal-token: $INTERNAL_AUTH_TOKEN" \
  -d "{\"username\":\"$USER\",\"password\":\"$password\",\"clientIp\":\"$IP\"}" \
  http://api:4000/api/v1/internal/smtp-auth)

# Check HTTP Status Code
if [ "$response" = "200" ]; then
  exit 0
else
  exit 1
fi
