# GhostSMTP Security Policy & Practices

This document outlines the security architecture, authentication methods, cryptographic controls, and tenant isolation practices implemented in GhostSMTP.

## Identity & Access Management (IAM)

### 1. Firebase Authentication & JWT
* **Client Auth**: Dashboard operations are guarded by Firebase Authentication.
* **Token Verification**: Every REST request (under `/api/v1/*` except `/emails/send`) must carry a `Authorization: Bearer <JWT>` header containing a Firebase ID Token.
* **JWT Integrity**: The backend verify routine uses `firebase-admin` to validate token signatures, issuer claims, and expiration bounds.

### 2. Programmatic API Keys (SHA-256)
* **Storage Hashing**: API Keys are never stored as plain text. The system computes a `SHA-256` hash of the API Key secret:
  `hash = crypto.createHash('sha256').update(rawToken).digest('hex')`
* **Lookup Verification**: When validating emails sends, the database queries matching hashes. This blocks token extraction in the event of database leaks.
* **Scopes Restrictions**: Scopes are evaluated at the route middleware layer. The `'send'` scope is required for email submission routes, and the `'admin'` scope is required for configuration changes.

### 3. SMTP Password Hashing (Argon2)
* Traditional SMTP relays check client passwords. Passwords are hashed using the memory-hard **Argon2id** algorithm, preventing offline GPU brute-force attempts:
  ```typescript
  import argon2 from 'argon2';
  const hashed = await argon2.hash(password);
  ```

---

## Cryptographic Message Integrity & Webhooks

### HMAC Webhook Signatures
Outbound webhook dispatch requests include header signatures to ensure integrity and identify source origin.
* **Signature Generation**: The payload body is hashed using `HMAC-SHA256` with the client's webhook secret:
  `Signature = hmac_sha256(secret, timestamp + "." + payload)`
* **Timestamp Replay Protection**: Payloads bind a millisecond timestamp parameter. Endpoints should drop any webhook requests carrying timestamps older than 5 minutes to block man-in-the-middle replay attacks.

---

## Tenant Isolation (Workspace Boundary)

* **Isolated Contexts**: Every MongoDB document includes a `workspaceId` attribute.
* **Headers Verification**: API calls must include a `X-Workspace-ID` header.
* **Permission Enforcement**: The auth check middleware ensures the authenticated user is a registered member of the workspace (mapped inside their MongoDB `User` profile doc), blocking cross-tenant extraction vectors.

---

## Vulnerability & Dependency Scan Report (Audited 2026-08-01)

An audit check was executed on system packages, displaying the following vulnerabilities:

1. **Vite Development Compiler (`esbuild <= 0.24.2`)**:
   * *Risk*: Moderate.
   * *Status*: Internal development tool only. Production static files are served by Nginx. Not exposed to production gateways.
2. **React Router Dom (`react-router <= 7.17.0`)**:
   * *Risk*: Moderate (open redirects / SSR Hydration deserialize errors).
   * *Mitigation*: Dashboard layout uses static links and routes. SSR features are disabled. No external user-supplied redirect links parameters are passed.
3. **Firebase Client SDK (`uuid < 11.1.1`)**:
   * *Risk*: Moderate. Buffer boundary checks warnings.
   * *Mitigation*: Used internally within Firebase Auth and BullMQ queues IDs context generations. Inputs are verified to be alphanumeric.
