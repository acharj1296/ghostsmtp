# GhostSMTP Production Infrastructure Plan

**Document Version:** 1.0  
**Date:** 2026-08-04  
**Author:** Principal Email Infrastructure Engineer

---

## Executive Summary

This document outlines the transformation of GhostSMTP from a demonstration project into a production-grade SMTP hosting provider comparable to Mailgun, SendGrid, Amazon SES, and similar services.

The primary objective is to ensure that when a user adds a domain, the system generates **real DNS records** derived from the actual mail infrastructure, not placeholder values.

---

## Implementation Status (2026-08-05)

The following has been **implemented**. It is backward compatible — all existing API response shapes (`createDomain` → `{ domain, dkim, verification }`, `getDetails` → `{ domain, dnsRecords, verification }`, `verifyDomain` → `{ status, domain, verification }`) are preserved and extended, never replaced.

### New backend services

| File | Purpose |
|------|---------|
| `server/src/services/dnsGenerator.service.ts` | Builds the **real** DNS record set (SPF/DKIM/DMARC/MX/tracking/bounce/return-path/autoconfig/autodiscover) from the actual mail infra env (`MAIL_SERVER_HOST`, `MAIL_SERVER_IP`, `MAIL_BASE_DOMAIN`, subdomain prefixes, DMARC policy). Deterministic, per-domain overrides. |
| `server/src/services/dnsLookup.service.ts` | Production live DNS verification against public resolvers. Normalized expected-vs-actual matching for TXT/MX/CNAME/SRV with per-record `{ verified, actual, allActual, error }` results. Never throws — always returns a full picture. |
| `server/src/services/opendkim.service.ts` | Bridges Node.js keygen with the OpenDKIM milter: writes the real private key to the shared volume and updates `KeyTable`/`SigningTable`. **Best-effort** — a sync failure never blocks domain creation. |

### Domain provisioning (`server/src/services/domain.service.ts`)

- **`createDomain`** — generates a real RSA keypair, encrypts the private key at rest, syncs it to OpenDKIM, and persists the **full generated DNS set** (no more `relay.ghostsmtp.com` placeholders).
- **`getDomainDetails`** — returns all 10 record types plus the legacy aliases (`cname` kept for tracking).
- **`verifyDomain`** — runs live DNS checks for SPF/DKIM/DMARC/MX/tracking/bounce/return-path/autoconfig/autodiscover; stores detailed `verificationResults` + `verificationErrors`; status = `verified` only when the 6 sending-critical checks pass.
- **`regenerateDkim`** — key rotation; new key synced to OpenDKIM + DKIM record refreshed.
- **`ensureProductionRecords`** — auto-upgrades legacy domains created before this change so they also receive real records.

### Data model (backward compatible, all new fields defaulted)

- `DomainVerification` — added `trackingCname`, `bounceCname`, `returnPathRecord`, `autoconfigCname`, `autodiscoverRecord`, `mailFrom`, `dmarcPolicy`, per-record verified flags, `verificationResults`, `verificationErrors`.
- `Domain` — added `dmarcPolicy`, `returnPathSubdomain`.
- `DkimKey` — `keySize`, `expiresAt`, `opendkimPath` (existing fields retained).

### Infrastructure

- `docker-compose.yml` — shared DKIM volume (`./docker/mail/opendkim/keys`) + `KeyTable`/`SigningTable` bind-mounted into **api**, **send-worker**, and **opendkim**; mail infra env vars wired to api/worker; Postfix hostname/domain parameterized via `MAIL_SERVER_HOST`/`MAIL_BASE_DOMAIN`.
- `docker/mail/opendkim/entrypoint.sh` + `Dockerfile` — chowns the shared keys volume (API writes as root, milter runs as `opendkim`) and guarantees the tables exist.
- `docker/mail/opendkim/KeyTable` / `SigningTable` — now populated dynamically by the API per domain.
- `docker/mail/opendmarc/opendmarc.conf` — `AuthservID`/`TrustedAuthservIDs` corrected to the real mail hostname.
- DKIM keys written `0644` (never world-writable) so the `opendkim` user can read them.

### Frontend (`client/src/pages/Domains.tsx`)

- New `DnsRecordCard` component renders each record **entirely from the backend response** (the frontend never synthesizes DNS values).
- Added Tracking / Bounce / Return-Path / Autoconfig / Autodiscover cards + a "Verification Details" panel showing per-record errors.
- Existing DKIM/SPF/DMARC/MX blocks and all existing functionality unchanged.

### New API endpoint

- `POST /domains/:id/regenerate-dkim` — rotate the DKIM keypair (non-breaking addition).

### Deployment notes

Set these in the root `.env` so generated records reflect your real host: `MAIL_SERVER_HOST`, `MAIL_SERVER_IP`, `MAIL_BASE_DOMAIN`, `TRACKING_SUBDOMAIN`, `BOUNCE_SUBDOMAIN`, `AUTOCONFIG_SUBDOMAIN`, `DEFAULT_DKIM_SELECTOR`, `DKIM_KEY_SIZE`, `DMARC_RUA`, `DMARC_RUF`.

> **Inbound bounce processing** (Dovecot LMTP + VERP mailbox ingestion) is intentionally left for a follow-up: it requires the `postfix-mongodb` map plugin in the image (not currently installed) and inbound MX delivery, which is out of scope for this phase and would risk the working outbound relay if enabled prematurely.

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Current Limitations](#2-current-limitations)
3. [Missing Production Features](#3-missing-production-features)
4. [Required DNS Records](#4-required-dns-records)
5. [Implementation Phases](#5-implementation-phases)
6. [Deployment Considerations](#deployment-considerations)

---

## 1. Current Architecture Analysis

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, TypeScript, TailwindCSS |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB |
| Cache/Queue | Redis, BullMQ |
| Mail Transfer | Postfix |
| Mail Delivery | Dovecot |
| DKIM Signing | OpenDKIM |
| DMARC Verification | OpenDMARC |
| Spam Filtering | Rspamd |
| Reverse Proxy | Nginx |
| Containerization | Docker, Docker Compose |

### Current Domain Provisioning Flow

```
User adds domain
    ↓
DomainService.createDomain()
    ↓
Generates RSA keypair using Node.js crypto (NOT OpenDKIM)
    ↓
Creates placeholder DNS records:
  - SPF: "v=spf1 include:relay.ghostsmtp.com ~all"
  - DKIM: Uses software-generated key
  - DMARC: "v=DMARC1; p=none; rua=mailto:dmarc-reports@ghostsmtp.com"
  - MX: "10 mail.ghostsmtp.com"
  - CNAME: "tracking.ghostsmtp.com"
    ↓
Stores in MongoDB
    ↓
Frontend displays hardcoded values
```

### Current Mail Sending Flow

```
API Request
    ↓
Authentication Middleware
    ↓
Email Controller
    ↓
Queue Service (BullMQ/Redis)
    ↓
Worker Process
    ↓
Nodemailer → Postfix (port 25)
    ↓
Postfix → OpenDKIM milter (port 12345)
    ↓
OpenDKIM → Attempts to sign (BUT KeyTable is empty!)
    ↓
OpenDMARC milter (port 54321)
    ↓
Rspamd milter (port 11332)
    ↓
Outbound Delivery
```

### Key Files Analyzed

**Backend:**
- `server/src/services/domain.service.ts` - DNS record generation (placeholder values)
- `server/src/models/domain.model.ts` - Domain schema
- `server/src/models/domainVerification.model.ts` - Verification tracking
- `server/src/models/dkimKey.model.ts` - DKIM key storage
- `server/src/repositories/*.repository.ts` - Data access layer
- `server/src/services/queue.service.ts` - Email queue processing
- `server/src/services/smtpTransport.service.ts` - SMTP transport

**Infrastructure:**
- `docker-compose.yml` - Service orchestration
- `docker/mail/postfix/main.cf` - Postfix configuration
- `docker/mail/postfix/master.cf` - Postfix services
- `docker/mail/opendkim/opendkim.conf` - OpenDKIM config
- `docker/mail/opendkim/KeyTable` - Empty (critical issue!)
- `docker/mail/opendkim/SigningTable` - Empty (critical issue!)
- `docker/mail/opendmarc/opendmarc.conf` - OpenDMARC config
- `docker/mail/dovecot/dovecot.conf` - Dovecot auth

**Frontend:**
- `client/src/pages/Domains.tsx` - Domain management UI

---

## 2. Current Limitations

### Critical Issues

| Issue | Description | Impact |
|-------|-------------|--------|
| **Placeholder DNS Records** | All DNS records use hardcoded values like `relay.ghostsmtp.com` | Users cannot actually send emails |
| **DKIM Keys Not Integrated** | Keys generated in Node.js, not shared with OpenDKIM container | Emails are NOT DKIM signed |
| **Empty OpenDKIM Tables** | KeyTable and SigningTable are empty | No domains configured for signing |
| **No Real Infrastructure Binding** | DNS records don't reflect actual mail server IP/hostname | SPF/DKIM verification fails |
| **No Return-Path/Bounce Handling** | Missing VERP and bounce processing | Cannot track bounces |
| **No Tracking Domain CNAME** | Placeholder only, not functional | Open tracking broken |
| **No Autoconfig/Autodiscover** | Missing email client auto-configuration | Poor UX for end users |

### Architectural Gaps

1. **DKIM Key Disconnect**
   - Node.js generates keys → stored in MongoDB
   - OpenDKIM reads keys → expects files in `/etc/opendkim/keys/`
   - These two systems are NOT connected
   - Result: Emails sent without valid DKIM signatures

2. **Missing Infrastructure Configuration**
   - `MAIL_HOSTNAME` and `MAIL_DOMAIN` are hardcoded in docker-compose
   - No way to configure per-domain settings
   - No dynamic IP detection for SPF

3. **No Bounce Processing Pipeline**
   - No VERP (Variable Envelope Return Path)
   - No bounce webhook notifications
   - No bounce rate tracking

---

## 3. Missing Production Features

### DNS Records (Required for Production)

| Record Type | Current Status | Required |
|-------------|----------------|----------|
| SPF | Hardcoded placeholder | Dynamic based on mail server IP |
| DKIM | Software-generated key | Real OpenDKIM key from container |
| DMARC | Basic placeholder | Production-ready with rua/ruf |
| MX | Static value | Dynamic based on configuration |
| Return-Path | Missing | Required for bounce handling |
| Tracking CNAME | Placeholder | Functional tracking domain |
| Bounce CNAME | Missing | Required for bounce processing |
| Autoconfig | Missing | Mozilla Thunderbird auto-setup |
| Autodiscover | Missing | Outlook auto-configuration |

### Production Features Missing

1. **Multi-tenant DKIM Signing**
   - Each domain needs its own selector and keys
   - Keys must be accessible to OpenDKIM container
   - Automatic key rotation support

2. **Real-time DNS Verification**
   - Actual DNS lookups against public resolvers
   - Detailed error messages for misconfigurations
   - Propagation tracking

3. **Bounce Handling**
   - VERP address generation
   - Bounce processing via Dovecot LMTP
   - Webhook notifications for bounces

4. **IP Pool Management**
   - Multiple sending IPs
   - IP warming schedules
   - Dedicated IP assignment

5. **Domain Health Monitoring**
   - Continuous DNS verification
   - Blacklist checking
   - Reputation scoring

---

## 4. Required DNS Records

### Complete DNS Record Set for Production

When a user adds a domain, the following records must be generated:

#### 1. MX Record
```
Type: MX
Host: @ (or customer-domain.com)
Value: mail.ghosthosting.qzz.io (or configured mail server)
Priority: 10
TTL: 3600
```

#### 2. SPF Record
```
Type: TXT
Host: @
Value: v=spf1 ip4:<MAIL_SERVER_IP> include:ghosthosting.qzz.io ~all
TTL: 3600

Production variant:
v=spf1 ip4:10.10.0.10 ip6:<IPv6> include:ghosthosting.qzz.io mx ~all
```

#### 3. DKIM Record
```
Type: TXT
Host: <selector>._domainkey.<customer-domain.com>
Value: v=DKIM1; k=rsa; p=<PUBLIC_KEY_FROM_OPENDKIM>
TTL: 3600
```

#### 4. DMARC Record
```
Type: TXT
Host: _dmarc.<customer-domain.com>
Value: v=DMARC1; p=none; rua=mailto:dmarc@<customer-domain.com>; ruf=mailto:dmarc@<customer-domain.com>; sp=none
TTL: 3600

Production (after warmup):
v=DMARC1; p=quarantine; rua=mailto:dmarc-rua@ghosthosting.qzz.io; pct=100; adkim=s; aspf=s
```

#### 5. Return-Path / Bounce Domain
```
Type: CNAME
Host: bounce.<customer-domain.com>
Value: bounce.ghosthosting.qzz.io
TTL: 3600
```

#### 6. Tracking Domain
```
Type: CNAME
Host: tracking.<customer-domain.com>
Value: tracking.ghosthosting.qzz.io
TTL: 3600
```

#### 7. Autoconfig (Mozilla)
```
Type: CNAME
Host: autoconfig.<customer-domain.com>
Value: autoconfig.ghosthosting.qzz.io
TTL: 3600
```

#### 8. Autodiscover (Microsoft)
```
Type: SRV
Host: _autodiscover._tcp.<customer-domain.com>
Value: 0 1 443 autodiscover.ghosthosting.qzz.io
TTL: 3600
```

---

## 5. Implementation Phases

### Phase 1: Database Schema Updates

**Files to Modify:**
- `server/src/models/domain.model.ts`
- `server/src/models/domainVerification.model.ts`
- `server/src/models/dkimKey.model.ts`

**Changes:**

1. Update Domain model:
```typescript
interface IDomain {
  workspaceId: Types.ObjectId;
  name: string;
  status: 'pending' | 'verified' | 'failed';
  
  // New fields
  dkimSelector: string;          // e.g., 'ghost', 'k1', etc.
  trackingSubdomain: string;     // e.g., 'tracking'
  bounceSubdomain: string;       // e.g., 'bounce'
  returnPathDomain: string;      // e.g., 'bounce.customer.com'
  
  // Infrastructure binding
  mailServerHost: string;        // e.g., 'mail.ghosthosting.qzz.io'
  mailServerIp: string;          // Resolved IP
  
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

2. Update DomainVerification model:
```typescript
interface IDomainVerification {
  domainId: Types.ObjectId;
  
  // Expected values (what user should set)
  spfRecord: string;
  dkimRecord: string;
  dmarcRecord: string;
  mxRecord: string;
  trackingCname: string;
  bounceCname: string;
  returnPathRecord: string;
  autoconfigCname: string;
  autodiscoverRecord: string;
  
  // Actual values (what DNS returns)
  actualSpf: string;
  actualDkim: string;
  actualDmarc: string;
  actualMx: string;
  
  // Verification status
  spfVerified: boolean;
  dkimVerified: boolean;
  dmarcVerified: boolean;
  mxVerified: boolean;
  trackingVerified: boolean;
  bounceVerified: boolean;
  
  lastVerifiedAt?: Date;
  verificationErrors: string[];  // Detailed error messages
}
```

3. Update DkimKey model:
```typescript
interface IDkimKey {
  domainId: Types.ObjectId;
  selector: string;
  privateKey: string;      // Encrypted
  publicKey: string;
  
  // New fields
  keySize: number;         // 2048 or 4096
  isActive: boolean;
  generatedAt: Date;
  expiresAt?: Date;        // For key rotation
  opendkimPath?: string;   // Path in container
}
```

**Database Impact:**
- New indexes needed on `dkimSelector`, `trackingSubdomain`
- Migration script for existing domains
- No breaking changes to existing API responses

---

### Phase 2: DKIM Key Infrastructure

**Goal:** Connect Node.js DKIM generation with OpenDKIM container

**Approach:** Shared volume with key files that OpenDKIM can read

**Files to Create/Modify:**

1. Create `server/src/services/opendkim.service.ts`
2. Update `docker/mail/opendkim/Dockerfile`
3. Create key generation script
4. Update OpenDKIM configuration

**Docker Changes:**
```yaml
opendkim:
  volumes:
    - opendkim_keys:/etc/opendkim/keys
    - ./docker/mail/opendkim/KeyTable:/etc/opendkim/KeyTable:ro
    - ./docker/mail/opendkim/SigningTable:/etc/opendkim/SigningTable:ro
```

**API Impact:**
- New endpoint: `POST /domains/:id/regenerate-dkim`
- DKIM public key read from actual generated file

---

### Phase 3: DNS Record Generation Service

**Goal:** Generate DNS records from actual infrastructure configuration

**Files to Create:**

1. `server/src/services/dnsGenerator.service.ts`
2. Update `server/src/services/domain.service.ts`

**Environment Variables Needed:**
```bash
MAIL_SERVER_HOST=mail.ghosthosting.qzz.io
MAIL_SERVER_IP=<actual-public-ip>
TRACKING_DOMAIN=tracking.ghosthosting.qzz.io
BOUNCE_DOMAIN=bounce.ghosthosting.qzz.io
SPF_INCLUDE_DOMAIN=ghosthosting.qzz.io
DMARC_RUA_EMAIL=dmarc-reports@ghosthosting.qzz.io
```

---

### Phase 4: Domain Verification Enhancement

**Goal:** Real DNS verification with detailed feedback

**Files to Modify:**
- `server/src/services/domain.service.ts`
- Create `server/src/services/dnsLookup.service.ts`

**API Changes:**
- Enhanced verification results with detailed error messages
- Actual vs expected values for all DNS records

---

### Phase 5: Mail Infrastructure Configuration

**Goal:** Configure Postfix, OpenDKIM, OpenDMARC for production multi-domain

**Files to Modify:**
- `docker/mail/postfix/main.cf`
- `docker/mail/opendkim/*`
- `docker/mail/opendmarc/opendmarc.conf`
- `docker/mail/dovecot/*`

**Key Changes:**
1. Enable virtual domain support in Postfix
2. Dynamic KeyTable/SigningTable generation
3. Proper HELO identity configuration
4. Return-path rewriting

---

### Phase 6: Frontend Updates

**Goal:** Display real DNS records from backend

**Files to Modify:**
- `client/src/pages/Domains.tsx`

**Changes:**
1. Add new DNS record sections
2. Show actual vs expected values
3. Display verification errors
4. Add "Refresh Verification" button

---

## Implementation Sequence

```
Week 1: Phase 1 + Phase 2
  ├── Update database models
  ├── Add new fields to domain/verification
  ├── Create OpenDKIM service
  └── Test DKIM key generation with container

Week 2: Phase 3 + Phase 4
  ├── Create DNS Generator service
  ├── Update Domain service
  ├── Create DNS Lookup service
  └── Enhance verification logic

Week 3: Phase 5
  ├── Update Postfix configuration
  ├── Update OpenDKIM configuration
  ├── Update OpenDMARC configuration
  └── Test end-to-end mail flow

Week 4: Phase 6 + Testing
  ├── Update frontend
  ├── Integration testing
  ├── Load testing
  └── Documentation
```

---

## Deployment Considerations

### Environment Variables Required

```bash
MAIL_SERVER_HOST=mail.ghosthosting.qzz.io
MAIL_SERVER_IP=<PUBLIC_IP>
MAIL_DOMAIN=ghosthosting.qzz.io
TRACKING_DOMAIN=tracking.ghosthosting.qzz.io
BOUNCE_DOMAIN=bounce.ghosthosting.qzz.io
SPF_INCLUDE_DOMAIN=ghosthosting.qzz.io
DMARC_RUA_EMAIL=dmarc-rua@ghosthosting.qzz.io
INTERNAL_AUTH_TOKEN=<secure-token>
```

### Docker Network Configuration

- Mail services on dedicated overlay network (10.10.0.0/24)
- API must access OpenDKIM for key management
- Shared volume for DKIM keys

### SSL/TLS Certificates

- Valid certificates for mail server
- Let's Encrypt or wildcard certificate
- TLS on ports 587, 465

### Monitoring

- DKIM signing success rate
- DMARC pass/fail rates
- Bounce processing metrics
- DNS verification status

---

## Success Criteria

1. DNS records generated from actual infrastructure
2. DKIM keys created in OpenDKIM container
3. Email signed with valid DKIM signature
4. SPF passes for sending IP
5. DMARC verification works
6. Bounce handling functional
7. Tracking domain operational
8. All existing features continue to work
9. No breaking API changes
10. Frontend displays accurate DNS values

---

## Appendix: File Change Summary

### Backend Files Modified

- `server/src/models/domain.model.ts`
- `server/src/models/domainVerification.model.ts`
- `server/src/models/dkimKey.model.ts`
- `server/src/services/domain.service.ts`
- `server/src/repositories/domain.repository.ts`

### Backend Files Created

- `server/src/services/dnsGenerator.service.ts`
- `server/src/services/dnsLookup.service.ts`
- `server/src/services/opendkim.service.ts`

### Infrastructure Files Modified

- `docker-compose.yml`
- `docker/mail/postfix/main.cf`
- `docker/mail/opendkim/Dockerfile`
- `docker/mail/opendkim/opendkim.conf`

### Infrastructure Files Created

- `docker/mail/opendkim/entrypoint.sh`
- `docker/mail/opendkim/generate-keys.sh`

### Frontend Files Modified

- `client/src/pages/Domains.tsx`

---

**End of Document**
