# GhostSMTP API Reference

This document defines the REST API endpoints, authorization protocols, validation formats, and error response structures for the GhostSMTP system.

## General Information

### Base URL
* Dev Server: `http://localhost:4000/api/v1`

### Global Request Headers
* `Content-Type: application/json`
* `X-Workspace-ID`: Required context header for workspace/tenant isolation.
* `Authorization`: Bearer JWT token (Firebase ID Token) for dashboard/client API requests.
* `X-API-Key`: Bearer programmatic key for sending transactional emails.

### HTTP Status Codes
* `200 OK`: Successful lookup or updates execution.
* `201 Created`: Resources successfully provisioned.
* `202 Accepted`: Asynchronous job payload successfully enqueued.
* `400 Bad Request`: Parameter validation failures or schema mismatch.
* `401 Unauthorized`: Missing or expired authentication credentials.
* `403 Forbidden`: Tenant workspace access permission lookup failures.
* `404 Not Found`: Target resource not found in database.
* `500 Internal Error`: Backend runtime failures (stack traces are stripped in production).

---

## Response & Error Formats

### Standard Success Response
```json
{
  "status": "success",
  "data": {
    "key": "value"
  }
}
```

### Standard Error Response
```json
{
  "error": "Error identification description string."
}
```

---

## Endpoint Specifications

### 1. SMTP Credentials API (`/credentials`)

#### List Credentials
* **Method**: `GET`
* **Route**: `/credentials/smtp`
* **Auth**: Firebase JWT

#### Create Credential Key
* **Method**: `POST`
* **Route**: `/credentials/smtp`
* **Auth**: Firebase JWT
* **Body Schema**:
  ```json
  {
    "description": "Website App Key"
  }
  ```
* **Response**: Returns the raw secret password *once*.
  ```json
  {
    "username": "smtp-workspace-id-random",
    "password": "smtp_pass_random_secret",
    "description": "Website App Key"
  }
  ```

#### Regenerate Password
* **Method**: `POST`
* **Route**: `/credentials/smtp/:id/regenerate`
* **Auth**: Firebase JWT
* **Response**: Returns the regenerated password *once*.
  ```json
  {
    "password": "smtp_pass_regenerated_secret"
  }
  ```

#### Toggle Credential Status
* **Method**: `PATCH`
* **Route**: `/credentials/smtp/:id/status`
* **Auth**: Firebase JWT
* **Body Schema**:
  ```json
  {
    "status": "active" // or "disabled"
  }
  ```

#### Delete Credential
* **Method**: `DELETE`
* **Route**: `/credentials/smtp/:id`
* **Auth**: Firebase JWT

---

### 2. Programmatic API Keys API (`/credentials/apikeys`)

#### List API Keys
* **Method**: `GET`
* **Route**: `/credentials/apikeys`
* **Auth**: Firebase JWT

#### Create API Key
* **Method**: `POST`
* **Route**: `/credentials/apikeys`
* **Auth**: Firebase JWT
* **Body Schema**:
  ```json
  {
    "name": "Production Server",
    "scopes": ["send"] // or "admin"
  }
  ```
* **Response**: Returns raw bearer token *once*.
  ```json
  {
    "token": "api_key_raw_bearer_secret"
  }
  ```

#### Toggle Key Status
* **Method**: `PATCH`
* **Route**: `/credentials/apikeys/:id/status`
* **Auth**: Firebase JWT
* **Body Schema**:
  ```json
  {
    "status": "active" // or "disabled" or "revoked"
  }
  ```

---

### 3. Domains API (`/domains`)

#### Register Send Domain
* **Method**: `POST`
* **Route**: `/domains`
* **Auth**: Firebase JWT
* **Body Schema**:
  ```json
  {
    "name": "yourcompany.com"
  }
  ```

#### Get Domain Details & DNS Configuration
* **Method**: `GET`
* **Route**: `/domains/:id`
* **Auth**: Firebase JWT

#### Trigger DNS Records Verification
* **Method**: `POST`
* **Route**: `/domains/:id/verify`
* **Auth**: Firebase JWT
* **Response**: Returns updated status.
  ```json
  {
    "status": "verified" // or "unverified"
  }
  ```

---

### 4. Transactional Emails sending API (`/emails`)

#### Send Transactional Email
* **Method**: `POST`
* **Route**: `/emails/send`
* **Auth**: API Key (`X-API-Key`)
* **Body Schema**:
  ```json
  {
    "from": "sender@yourcompany.com",
    "to": ["recipient@target.com"],
    "cc": ["manager@target.com"],
    "bcc": [],
    "subject": "System Alert Notification",
    "text": "Plain Text payload",
    "html": "<h3>HTML payload</h3>",
    "replyTo": "support@yourcompany.com",
    "headers": {
      "X-Custom-Header": "custom-value"
    },
    "attachments": [
      {
        "filename": "report.pdf",
        "content": "base64_encoded_payload",
        "contentType": "application/pdf"
      }
    ]
  }
  ```
* **Response**: `202 Accepted`
  ```json
  {
    "messageId": "msg_id_uuid",
    "status": "queued"
  }
  ```

#### Get Dashboard Stats
* **Method**: `GET`
* **Route**: `/emails/stats`
* **Auth**: Firebase JWT

#### List Transmission Logs
* **Method**: `GET`
* **Route**: `/emails`
* **Auth**: Firebase JWT

---

### 5. Webhooks API (`/webhooks`)

#### Create Webhook Endpoint
* **Method**: `POST`
* **Route**: `/webhooks`
* **Auth**: Firebase JWT
* **Body Schema**:
  ```json
  {
    "url": "https://callback.customer.com/webhook",
    "events": ["delivered", "bounced", "complained"]
  }
  ```

#### Rotate Signature Secret
* **Method**: `POST`
* **Route**: `/webhooks/:id/rotate`
* **Auth**: Firebase JWT

#### Test Webhook Endpoint Connectivity
* **Method**: `POST`
* **Route**: `/webhooks/:id/test`
* **Auth**: Firebase JWT
