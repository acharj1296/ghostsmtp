# GhostSMTP — Project Setup Guide

GhostSMTP is a multi-tenant SMTP hosting platform (SendGrid-style) built with a React (Vite) client, an Express + TypeScript API, MongoDB, Redis + BullMQ, Firebase Auth, and a full Docker mail stack (Postfix, Dovecot, OpenDKIM, OpenDMARC, Rspamd, Nginx).

## 1. Architecture Overview

```
Client (React SPA)  ── nginx edge (port 80) ──┐
                                             ├──> api:4000  (/api/*)   ──> MongoDB, Redis
                                             └──> client:80 (/)         (static SPA build)
                                                    |
api (Express, port 4000) ── BullMQ email-queue ──> postfix:25  (local relay) ──> mail milters
                        └── BullMQ webhook-queue ──> outbound HTTPS webhook callbacks
postfix:587 ── SASL ──> dovecot:10001 ── auth-helper.sh ──> api:4000/api/v1/internal/smtp-auth
```

| Service | Container | Internal | Host | Purpose |
|---|---|---|---|---|
| `db` | ghostsmtp-db | 27017 | 27017 | MongoDB 6 |
| `mongo-express` | ghostsmtp-mongo-express | 8081 | 8082 | Mongo admin UI |
| `redis` | ghostsmtp-redis | 6379 | 6379 | Redis 7 |
| `redis-commander` | ghostsmtp-redis-commander | 8081 | 8081 | Redis admin UI |
| `nginx` | ghostsmtp-nginx | 80 | 80 | Edge proxy (API + SPA) |
| `api` | ghostsmtp-api | 4000 | 5000 | Express API + queue workers |
| `client` | ghostsmtp-client | 80 | – | Static SPA build (internal) |
| `postfix` | ghostsmtp-postfix | 25, 587 | 25, 587 | SMTP relay + submission |
| `dovecot` | ghostsmtp-dovecot | 143, 24, 10001 | 143 | IMAP + SASL auth helper |
| `opendkim` | ghostsmtp-opendkim | 12345 | – | DKIM signing milter |
| `opendmarc` | ghostsmtp-opendmarc | 54321 | – | DMARC milter |
| `rspamd` | ghostsmtp-rspamd | 11332, 11334 | 11334 | Spam filtering + UI |

## 2. Prerequisites

- **Docker** with Compose v2 (`docker compose`). Docker 29.x / Compose 5.x are confirmed working.
- **Node.js 18+ / npm** (only needed for local non-Docker development and tests).

## 3. Quick Start (Docker Compose)

1. Ensure a root `.env` exists at the project root with the Vite/Firebase build values used by the client image. It is gitignored; create it from `client/.env`:

   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_FIREBASE_MEASUREMENT_ID=...
   ```

   The `client` build fails fast with a clear error if any of these are missing.

2. Make sure `server/.env` has valid Firebase Admin credentials (already committed for the `ghostsmtp-27a1f` project) and points MongoDB/Redis at the Docker service names `db` / `redis`.

3. Build and start everything:

   ```
   docker compose up -d --build
   ```

4. Verify health:

   ```
   docker compose ps                 # all 12 containers should be "healthy"
   ```

5. Access:
   - Frontend: http://localhost
   - API health: http://localhost/api/v1/health or http://localhost:5000/api/v1/health
   - Mongo Express: http://localhost:8082
   - Redis Commander: http://localhost:8081
   - Rspamd UI: http://localhost:11334

## 4. Local Development (without Docker)

The API and client can run directly on the host for faster iteration while MongoDB/Redis/Postfix run in Docker.

- **API**: `cd server && npm install && npm run dev` (ts-node-dev, port 4000).
  `server/.env` points `MONGODB_URI` at `db:27017` and `REDIS_URL` at `redis:6379` (Docker service names). For host runs, override them:

  ```
  $env:MONGODB_URI="mongodb://admin:admin_password@localhost:27017/ghostsmtp?authSource=admin"
  $env:REDIS_URL="redis://localhost:6379"
  npm run dev
  ```

- **Client**: `cd client && npm install && npm run dev` (Vite on port 3000). Vite proxies `/api` to `localhost:4000`.
  Firebase web config comes from `client/.env`.

- Building for production: `cd server && npm run build && npm start` and `cd client && npm run build`.

## 5. Environment Variables

### Server (`server/.env`, loaded via `server/src/config/env.ts`)
| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | no | `development` (default), `production`, `test` |
| `PORT` | no | Default `4000` |
| `MONGODB_URI` | no | Defaults to `mongodb://admin:admin_password@localhost:27017/ghostsmtp?authSource=admin` |
| `REDIS_URL` | no | Defaults to `redis://localhost:6379` |
| `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_CLIENT_ID`, `FIREBASE_CLIENT_X509_CERT_URL` | yes | Firebase Admin service account |
| `ENCRYPTION_KEY` | no | AES key for encrypting upstream SMTP passwords. **Must be set** to create/use external SMTP credentials; server still starts without it. |
| `SMTP_HOST` / `SMTP_PORT` | no | Local Postfix relay. Docker Compose overrides `SMTP_HOST=postfix` for the `api` container; host runs default to `localhost:25`. |
| `ALLOWED_ORIGINS` | no | Comma-separated CORS origins; any origin allowed in non-production. |

### Client build args (`client/Dockerfile`)
`VITE_FIREBASE_*` — provided via Compose `build.args` from the root `.env`. Also used at dev time from `client/.env`.

## 6. Mail Infrastructure Notes

- Postfix relays from the API worker via `postfix:25` (Docker-internal) or `localhost:25` (host). `mynetworks` includes the Docker bridge ranges so the API container can relay.
- Submission (port 587) is enabled in `docker/mail/postfix/master.cf` and supports SASL (PLAIN/LOGIN) via Dovecot. Dovecot's `auth-helper.sh` authenticates against the API: `POST http://api:4000/api/v1/internal/smtp-auth`.
- IMAP is exposed on port 143 (Dovecot, `dovecot_mail` volume under `/var/mail`).
- The virtual mailbox maps (`mongodb:` maps in `main.cf`) are intentionally commented out because the postfix image does not ship the MongoDB map support; enabling them breaks RCPT TO with `451 Temporary lookup failure`.
- DKIM/OpenDMARC/Rspamd are wired as Postfix milters in series: `opendkim:12345, opendmarc:54321, rspamd:11332`.

## 7. Running the Server Tests

Tests are self-executing scripts (no Jest/Mocha). They need a running MongoDB and Redis (the Compose containers publish both to the host).

Prerequisites for a clean run:

- Stop the API container so its BullMQ workers don't consume the test queues:
  ```
  docker compose stop api
  ```
- Set the test environment so the worker mocks activate and connections target the host-published services:
  ```
  $env:NODE_ENV='test'
  $env:MONGODB_URI='mongodb://admin:admin_password@localhost:27017/ghostsmtp_test?authSource=admin'
  $env:REDIS_URL='redis://localhost:6379'
  ```
  (`server/.env` would otherwise pin MongoDB to the Docker `db` host and `NODE_ENV=development`, which disables the worker mocks.)

Then run any suite from `server/`:

```
npx ts-node-dev --transpile-only src/tests/smtpAuth.test.ts
npx ts-node-dev --transpile-only src/tests/queue.test.ts
npx ts-node-dev --transpile-only src/tests/emailSend.test.ts
npx ts-node-dev --transpile-only src/tests/deliveryTracking.test.ts
npx ts-node-dev --transpile-only src/tests/bounceComplaint.test.ts
npx ts-node-dev --transpile-only src/tests/webhook.test.ts
```

All six suites pass (smtpAuth 6, queue 6, send 4, tracking 5, bounce 7, webhook 10).

`src/tests/smtpDelivery.integration.test.ts` is a **manual end-to-end test** that sends real email to an external recipient. It requires pre-existing workspace/credential ObjectIds and valid SMTP credentials — it is not part of the automated suite:

```
$env:SMTP_INTEGRATION_TEST='1'
$env:TEST_WORKSPACE_ID='...'
$env:TEST_CREDENTIAL_ID='...'
npx ts-node --transpile-only src/tests/smtpDelivery.integration.test.ts
```

After testing, restart the API:
```
docker compose start api
```

## 8. Notes & Known Gotchas

- The repo README and `docs/DATABASE.md` describe PostgreSQL and some aspirational services; the actual implementation uses **MongoDB** (mongoose) throughout, and delivery status is tracked in-app by `StatusUpdateService` (there is no external log watcher).
- The BullMQ `email-queue` and `webhook-queue` workers are started by `server/src/index.ts` (`getQueueService().startWorker()` and `WebhookQueueService.startWorker()`). Without the webhook worker, webhook deliveries are enqueued but never dispatched.
- `.env` at the project root is gitignored; the committed `server/.env` contains a live Firebase service-account private key — rotate/regenerate it if this repository is ever published.
