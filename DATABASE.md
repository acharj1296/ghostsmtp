# GhostSMTP Database Documentation

This document explains the database models, collections structures, index strategies, data lifecycle constraints, and Redis usage patterns for GhostSMTP.

## MongoDB Collection Schemas

### 1. User (`users`)
Tracks registered developers and dashboard users.
* **Fields**:
  * `firebaseUid`: String (Unique, Indexed) - Firebase identifier.
  * `email`: String (lowercase, trimmed).
  * `name`: String.
  * `workspaces`: Array of objects:
    * `workspaceId`: ObjectId (Ref: `Workspace`).
    * `role`: String ('owner', 'admin', 'developer').
  * `active`: Boolean (Default: true).
  * `isDeleted`: Boolean (Default: false).

### 2. Workspace (`workspaces`)
Represents isolated client tenants.
* **Fields**:
  * `name`: String.
  * `plan`: String ('free', 'growth', 'enterprise').
  * `isDeleted`: Boolean (Default: false).

### 3. Domain (`domains`)
Contains custom sender domains configured by workspaces.
* **Fields**:
  * `workspaceId`: ObjectId (Ref: `Workspace`, Indexed).
  * `name`: String (lower case).
  * `status`: String ('pending', 'verified').
  * `dkimKey`: Object (containing private/public keys and DNS records).
  * `spfValue`: String.
  * `dmarcValue`: String.
  * `mxValue`: String.

### 4. SmtpCredential (`smtp_credentials`)
Relay logins created to authorize sending emails.
* **Fields**:
  * `workspaceId`: ObjectId (Ref: `Workspace`, Indexed).
  * `username`: String (Unique, Indexed).
  * `passwordHash`: String (Argon2 hashed secret).
  * `description`: String.
  * `status`: String ('active', 'disabled').
  * `lastUsedAt`: Date.

### 5. ApiKey (`api_keys`)
REST credentials for transactional sends.
* **Fields**:
  * `workspaceId`: ObjectId (Ref: `Workspace`, Indexed).
  * `name`: String.
  * `keyHash`: String (SHA-256 hashed token, Unique, Indexed).
  * `scopes`: Array of strings ('send', 'admin').
  * `status`: String ('active', 'disabled', 'revoked').

### 6. EmailLog (`email_logs`)
Main log record tracking outgoing transactional transmissions.
* **Fields**:
  * `workspaceId`: ObjectId (Ref: `Workspace`, Indexed).
  * `messageId`: String (Unique, Indexed) - Mail Message-ID.
  * `recipient`: String (lowercase).
  * `sender`: String (lowercase).
  * `subject`: String.
  * `status`: String ('queued', 'processing', 'sent', 'delivered', 'deferred', 'bounced', 'complained', 'failed').

### 7. DeliveryEvent (`delivery_events`)
Structured event-store recording trace path status modifications.
* **Fields**:
  * `workspaceId`: ObjectId (Ref: `Workspace`, Indexed).
  * `messageId`: String (Indexed).
  * `status`: String.
  * `smtpResponse`: String.
  * `responseCode`: Number.
  * `remoteServer`: String.
  * `retryCount`: Number.

### 8. BounceEvent (`bounce_events`)
Details bounce failure events reported by MTA.
* **Fields**:
  * `workspaceId`: ObjectId (Ref: `Workspace`, Indexed).
  * `messageId`: String (Indexed).
  * `email`: String (lowercase, Indexed).
  * `bounceType`: String ('hard', 'soft').
  * `diagnosticCode`: String.

### 9. ComplaintEvent (`complaint_events`)
Details abuse/spam feedback reports.
* **Fields**:
  * `workspaceId`: ObjectId (Ref: `Workspace`, Indexed).
  * `messageId`: String.
  * `email`: String (lowercase, Indexed).
  * `feedbackType`: String (e.g. 'abuse', 'spam').

### 10. SuppressionEntry (`suppressions`)
Target recipients blocked from receiving further emails.
* **Fields**:
  * `workspaceId`: ObjectId (Ref: `Workspace`, Indexed).
  * `email`: String (lowercase, Indexed).
  * `reason`: String ('bounce', 'complaint', 'manual').
  * `active`: Boolean (Default: true).

### 11. Webhook (`webhooks`)
Registered webhook configurations.
* **Fields**:
  * `workspaceId`: ObjectId (Ref: `Workspace`, Indexed).
  * `url`: String.
  * `secret`: String - HMAC Signing Secret (`whsec_...`).
  * `events`: Array of strings (e.g., `'delivered'`, `'bounced'`).
  * `active`: Boolean (Default: true).

### 12. WebhookEvent & WebhookDelivery (`webhook_events`, `webhook_deliveries`)
Tracks dispatched payloads, states, request times, and responses.

---

## Database Indexing Strategy

### MongoDB Indexes
To enforce strict workspace tenant isolation, multi-tenant queries utilize compound indexes with `workspaceId`.

1. **`users`**:
   * `{ firebaseUid: 1 }` (Unique, Index)
2. **`domains`**:
   * `{ workspaceId: 1, name: 1 }` (Unique, Compound)
3. **`smtp_credentials`**:
   * `{ username: 1 }` (Unique, Index)
   * `{ workspaceId: 1 }` (Index)
4. **`api_keys`**:
   * `{ keyHash: 1 }` (Unique, Index)
   * `{ workspaceId: 1 }` (Index)
5. **`email_logs`**:
   * `{ messageId: 1 }` (Unique, Index)
   * `{ workspaceId: 1, createdAt: -1 }` (Compound Index for fast dashboard retrieval)
6. **`suppressions`**:
   * `{ workspaceId: 1, email: 1 }` (Unique, Compound)

---

## Redis Cache & BullMQ Usage

Redis handles transactional task distribution queues:
* **Mail Delivery Queue (`mail-queue`)**: BullMQ queue holding transactional email send jobs. Jobs carry parameters: recipient list, MIME details, retry metrics.
* **Webhook Dispatch Queue (`webhook-queue`)**: BullMQ queue for webhook POST dispatches. Ensures dispatches do not block main email logs transaction threads.
* **MTA Log Parsing**: Tracks temporary failure deferrals states to increment worker retry delays.
* **Job States**:
  * `active`: Currently being processed.
  * `wait`: Delayed jobs (scheduled sends or retry backoffs).
  * `completed` / `failed`: Success / failure records.
