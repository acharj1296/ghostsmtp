import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().default('mongodb://admin:admin_password@localhost:27017/ghostsmtp?authSource=admin'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  FIREBASE_PROJECT_ID: z.string().default('ghostsmtp-prod'),
  FIREBASE_PRIVATE_KEY_ID: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().default('-----BEGIN PRIVATE KEY-----\nplaceholder\n-----END PRIVATE KEY-----\n'),
  FIREBASE_CLIENT_EMAIL: z.string().default('placeholder@ghostsmtp-prod.iam.gserviceaccount.com'),
  FIREBASE_CLIENT_ID: z.string().optional(),
  FIREBASE_CLIENT_X509_CERT_URL: z.string().optional(),
  FIREBASE_DATABASE_URL: z.string().optional(),
  // ENCRYPTION_KEY is used to encrypt SMTP upstream passwords, webhook signing
  // secrets and DKIM private keys before persisting them. REQUIRED in production:
  // the server refuses to boot without it (fail closed).
  ENCRYPTION_KEY: z.string().optional(),
  // Shared secret required on internal (cross-service) endpoints such as
  // /api/v1/internal/smtp-auth. Used with a timing-safe header comparison.
  INTERNAL_AUTH_TOKEN: z.string().default('dev-internal-token'),
  // Number of trusted reverse-proxy hops for req.ip resolution. In the Docker
  // deployment this is always 1 (nginx is the only fronting proxy).
  TRUST_PROXY_HOPS: z.coerce.number().default(1),
  // Rate limiting (Redis-backed fixed window).
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_IP_MAX: z.coerce.number().default(200),

  // --- Mail Infrastructure Configuration ---
  // The public hostname that Postfix uses as its HELO/MX identity.
  // This is the hostname customers point their MX records to.
  MAIL_SERVER_HOST: z
    .string()
    .default(process.env.MAIL_HOSTNAME ?? 'mail.ghostsmtp.com'),

  // Public IP address of the mail server (used in SPF records).
  // If not set, the system will attempt DNS resolution of MAIL_SERVER_HOST.
  MAIL_SERVER_IP: z.string().optional(),

  // Public IPv6 address of the mail server (used in SPF and AAAA records).
  MAIL_SERVER_IPV6: z.string().optional(),

  // Base domain for hosted mail services (tracking, bounce, autoconfig, etc.).
  MAIL_BASE_DOMAIN: z.string().default('ghostsmtp.com'),

  // Subdomain prefix for tracking opens/clicks.
  TRACKING_SUBDOMAIN: z.string().default('track'),

  // Subdomain prefix for bounce/VERP handling.
  BOUNCE_SUBDOMAIN: z.string().default('bounce'),

  // Subdomain prefix for autoconfig (Thunderbird, Apple Mail).
  AUTOCONFIG_SUBDOMAIN: z.string().default('autoconfig'),

  // Default DKIM selector used for new domains.
  DEFAULT_DKIM_SELECTOR: z.string().default('ghost'),

  // DKIM key size (2048 recommended for production).
  DKIM_KEY_SIZE: z.coerce.number().default(2048),

  // DMARC aggregate/abuse report addresses (per RFC — must be pre-created mailboxes).
  DMARC_RUA: z.string().default('dmarc-rua@ghostsmtp.com'),
  DMARC_RUF: z.string().default('dmarc-ruf@ghostsmtp.com'),

  // MTA-STS policy ID (timestamp-based unique identifier).
  MTA_STS_ID: z.string().optional(),

  // TLS-RPT reporting email address.
  TLS_RPT_EMAIL: z.string().optional(),

  // CAA record for certificate authority authorization (e.g., '0 issue "letsencrypt.org"').
  CAA_RECORD: z.string().optional(),

  // BIMI logo URL for brand indicators.
  BIMI_LOGO_URL: z.string().optional(),

  // Path where OpenDKIM containers mount key files (shared volume).
  DKIM_KEYS_PATH: z.string().default('/etc/opendkim/keys'),

  // KeyTable / SigningTable file paths (shared bind-mounts) so the API can
  // register newly generated keys for signing.
  DKIM_KEYTABLE_PATH: z.string().default('/etc/opendkim/KeyTable'),
  DKIM_SIGNINGTABLE_PATH: z.string().default('/etc/opendkim/SigningTable'),

  // Docker API socket (used by OpendedkimService to manage keys in containers).
  DOCKER_HOST: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment configuration validation failed:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
