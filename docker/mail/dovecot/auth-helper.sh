#!/bin/sh

# Read password from FD 3
read -r password <&3

# If username or password is empty, exit with failure
if [ -z "$USER" ] || [ -z "$password" ]; then
  exit 1
fi

# Query Express Backend via HTTP POST
response=$(curl -s -w "%{http_code}" -o /tmp/auth_resp.json \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER\",\"password\":\"$password\",\"clientIp\":\"$IP\"}" \
  http://host.docker.internal:5000/api/v1/internal/smtp-auth)

# Check HTTP Status Code
if [ "$response" = "200" ]; then
  exit 0
else
  exit 1
fi
