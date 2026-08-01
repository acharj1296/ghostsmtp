# GhostSMTP

GhostSMTP is a production-grade, multi-tenant SMTP hosting platform (similar to SendGrid, Brevo, Mailgun, Amazon SES). It is designed to send real emails, manage custom domain validation (SPF, DKIM, DMARC), authenticate sending via API keys and SMTP relay credentials, queue and rate-limit outbound messages, and track delivery stats with rich analytics and webhooks.

## Tech Stack
- **Frontend**: React (Vite), Tailwind CSS
- **Backend**: Node.js (Express), TypeScript
- **Auth**: Firebase Authentication
- **Database**: PostgreSQL
- **Cache/Queue**: Redis + BullMQ
- **Mail Infrastructure**: Postfix, Dovecot, OpenDKIM, OpenDMARC, Rspamd, Nginx
- **Containerization**: Docker Compose

## Repository Structure
- `/client` - Frontend React application
- `/server` - Backend Express API server
- `/docker` - Mail server and Nginx configurations
- `docker-compose.yml` - Shared service orchestration (PostgreSQL, Redis, Nginx, Mail services)

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js (v18+) & npm

### Installation & Run instructions will be populated in subsequent phases.
