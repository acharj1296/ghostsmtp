# GhostSMTP

A production-grade, multi-tenant SMTP email hosting platform built for scalability and reliability. Similar to SendGrid, Brevo, Mailgun, or Amazon SES — but self-hosted and fully customizable.

## Features

- **Multi-tenant Architecture** — Isolated environments for each tenant with API key and SMTP credentials
- **Custom Domain Verification** — Full SPF, DKIM, and DMARC authentication setup for sender domains
- **Email Queue System** — Redis-backed BullMQ queues with rate limiting and retry logic
- **Real-time Webhooks** — Track delivery status, bounces, complaints, and opens in real-time
- **Rich Analytics** — Monitor open rates, click rates, bounce rates, and delivery metrics
- **Spam Protection** — Integrated Rspamd for advanced spam filtering
- **Secure Mail Infrastructure** — Postfix SMTP + Dovecot IMAP/POP3 with proper authentication

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | Express + TypeScript + Node.js |
| Authentication | Firebase Auth |
| Database | MongoDB 6.0 |
| Message Queue | Redis + BullMQ |
| Mail Server | Postfix, Dovecot, OpenDKIM, OpenDMARC |
| Spam Filter | Rspamd |
| Reverse Proxy | Nginx |
| Containerization | Docker Compose |

## Project Structure

```
ghostsmtp/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── services/      # API client services
│   │   ├── hooks/         # Custom React hooks
│   │   └── utils/         # Utility functions
│   └── Dockerfile
├── server/                 # Express API server
│   ├── src/
│   │   ├── config/        # Configuration modules
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Express middleware
│   │   ├── models/        # MongoDB schemas
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic
│   │   ├── workers/       # BullMQ job workers
│   │   └── index.ts       # Entry point
│   └── Dockerfile
├── docker/
│   ├── nginx/             # Nginx configuration
│   │   ├── conf.d/        # SSL and upstream configs
│   │   ├── entrypoint.sh  # Startup script
│   │   └── nginx.conf     # Main config
│   └── mail/              # Mail server configs
│       ├── dovecot/       # IMAP/POP3 setup
│       ├── postfix/       # SMTP server
│       ├── opendkim/      # DKIM signing
│       ├── opendmarc/     # DMARC verification
│       └── rspamd/        # Spam filtering
└── docker-compose.yml     # Full stack orchestration
```

## Quick Start

### Prerequisites

- Docker Desktop for Windows/Mac or Docker Engine + Docker Compose for Linux
- Node.js 18+ (for local development)
- Firebase project with Authentication enabled

### Environment Setup

1. **Clone and enter the directory:**
   ```bash
   git clone https://github.com/yourusername/ghostsmtp.git
   cd ghostsmtp
   ```

2. **Configure environment variables:**
   ```bash
   # Server
   cp server/.env.example server/.env
   # Edit server/.env with your values
   
   # Client (Firebase config)
   cp client/.env.example client/.env 2>/dev/null || create manually
   ```

3. **Required environment variables:**
   ```env
   # MongoDB
   MONGO_ROOT_PASSWORD=your-secure-password
   
   # Redis
   REDIS_PASSWORD=your-secure-password
   
   # Firebase (Client)
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
   
   # Internal Auth (for service-to-service communication)
   INTERNAL_AUTH_TOKEN=your-internal-auth-token
   
   # Optional: SSL
   SSL_ENABLED=false
   ```

4. **Start the full stack:**
   ```bash
   docker-compose up -d
   ```

5. **Access the application:**
   - Frontend: http://localhost
   - API: http://localhost/api/v1
   - Redis Commander: http://localhost:8081
   - Mongo Express: http://localhost:8081

### Local Development

```bash
# Backend
cd server
npm install
npm run dev

# Frontend (separate terminal)
cd client
npm install
npm run dev
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/login` | User authentication |
| `POST` | `/api/v1/auth/register` | User registration |
| `GET` | `/api/v1/domains` | List domains |
| `POST` | `/api/v1/domains` | Add domain |
| `GET` | `/api/v1/domains/:id/verify` | Verify domain DNS |
| `GET` | `/api/v1/api-keys` | List API keys |
| `POST` | `/api/v1/api-keys` | Create API key |
| `POST` | `/api/v1/email/send` | Send email |
| `GET` | `/api/v1/events` | Event logs |
| `GET` | `/api/v1/webhooks` | Webhook endpoints |
| `POST` | `/api/v1/webhooks` | Create webhook |
| `GET` | `/api/v1/analytics` | Delivery statistics |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Nginx Reverse Proxy                      │
│                    (SSL termination, load balancing)             │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│    Client     │   │     API       │   │   Send        │
│   React App   │   │   Express     │   │   Worker      │
│   :3000       │   │   :4000       │   │   :4000       │
└───────────────┘   └───────┬───────┘   └───────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│    MongoDB    │   │    Redis      │   │   Postfix     │
│   :27017      │   │   :6379       │   │   SMTP :25    │
│               │   │   (Queues)    │   │   SMTP :587   │
└───────────────┘   └───────────────┘   └───────────────┘
```

## Mail Flow

1. **Email Submission** — Via REST API or authenticated SMTP
2. **Validation** — Domain/address verification, DKIM signing
3. **Queue** — Placed in BullMQ with rate limiting
4. **Processing** — Worker picks job, sends via Postfix
5. **Tracking** — Events logged (sent, delivered, opened, bounced)
6. **Webhooks** — Real-time notifications to configured endpoints

## Security

- **Authentication** — JWT tokens via Firebase Auth
- **API Keys** — Per-tenant keys with scoped permissions
- **SMTP Auth** — Encrypted credentials for relaying
- **Rate Limiting** — Per-tenant and global rate limits
- **CORS** — Configured allowed origins
- **Helmet** — Security headers middleware
- **DKIM/DMARC** — Email authentication and validation

## Monitoring

- **Health Checks** — All services expose `/health` endpoints
- **Logs** — Docker container logging
- **Metrics** — Track queue depths, delivery rates, error rates

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License — see LICENSE file for details.