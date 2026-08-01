# GhostSMTP Production Deployment

This guide outlines container orchestration, networking structure, mail services configuration, and SSL setups for deploying GhostSMTP.

## Docker Compose Network Layout

The system divides containers into isolated networks to ensure security boundaries:

```
                  [ Nginx Reverse Proxy ]
                            │
                      (web-network)
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
         [ React SPA ]            [ Express API ]
                                         │
                                  (db-network & cache-network)
                                         │
                      ┌──────────────────┴──────────────────┐
                      ▼                                     ▼
                [ MongoDB ]                             [ Redis ]
                      ▲                                     ▲
                      │                                     │
                      └──────────────┬──────────────────────┘
                                     │
                               (mail-network)
                                     │
         ┌──────────────┬────────────┼─────────────┬──────────────┐
         ▼              ▼            ▼             ▼              ▼
    [ Postfix ]    [ Dovecot ]  [ OpenDKIM ]  [ OpenDMARC ]  [ Rspamd ]
```

### Network Segregation Definitions
1. `web-network`: Exposed to the public interface. Connects clients to the Nginx reverse proxy.
2. `db-network`: Isolated database communication channel shared by MongoDB, Dovecot, Postfix, and Express API.
3. `cache-network`: Cache distribution channel shared by Redis, Express API, Rspamd, and workers.
4. `mail-network`: Private mail routing network linking Postfix, Dovecot, OpenDKIM, OpenDMARC, and Rspamd.

---

## Services & Ports Map

| Service Name | Port (Internal) | Port (External) | Protocol | Purpose |
|---|---|---|---|---|
| `nginx` | 80 / 443 | 80 / 443 | TCP | Public gateway, handles SSL & routes front/back |
| `db` | 27017 | 27017 | TCP | MongoDB primary event store |
| `redis` | 6379 | 6379 | TCP | BullMQ queues coordinator |
| `postfix` | 25 / 587 | 25 / 587 | TCP | SMTP mail transfer agent & submission |
| `dovecot` | 143 / 24 | 143 | TCP | IMAP & LMTP local mailbox delivery agent |
| `rspamd` | 11334 | 11334 | TCP | Spam filter engine & dynamic learning |

---

## Environment Configuration (`.env`)

```ini
NODE_ENV=production
PORT=4000

# Database & Cache Locations
MONGO_URI=mongodb://admin:admin_password@db:27017/ghostsmtp?authSource=admin
REDIS_URL=redis://redis:6379

# Firebase Admin Configurations
FIREBASE_PROJECT_ID=ghostsmtp-prod
FIREBASE_CLIENT_EMAIL=admin@ghostsmtp-prod.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

---

## Postfix & Dovecot Configurations Setup

1. **Postfix SASL Authentication**:
   * Postfix delegates client credentials validation to Dovecot using LMTP SASL authentication sockets.
2. **Dovecot SQL lookup**:
   * Dovecot queries database user profiles from MongoDB using the Mongoose configurations, verifying active status and password hashes dynamically.
3. **OpenDKIM / OpenDMARC**:
   * Outbound emails are processed by OpenDKIM (running on port `12345`) to append security headers. OpenDMARC (running on port `54321`) validates incoming records.

---

## Reverse Proxy Setup (Nginx)

Nginx handles TLS/SSL terminations and proxies `/api` to the backend Express server, serving client SPA static files under `/`.

```nginx
server {
    listen 443 ssl http2;
    server_name yourcompany.com;

    ssl_certificate /etc/letsencrypt/live/yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourcompany.com/privkey.pem;

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://api:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Production Deployment Checklist

- [ ] Obtain SSL Certificates using certbot (Let's Encrypt).
- [ ] Configure DNS MX record: `MX 10 mail.yourcompany.com`.
- [ ] Configure SPF TXT record: `v=spf1 ip4:your_server_ip -all`.
- [ ] Generate DKIM keys, add TXT record, and register DKIM keys inside MongoDB.
- [ ] Deploy Docker containers: `docker compose up -d`.
- [ ] Verify outbound MTA test sends and trace delivery logs.
