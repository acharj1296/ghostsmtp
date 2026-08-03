import { SmtpCredentialRepository } from '../repositories/smtpCredential.repository';
import { ApiKeyRepository } from '../repositories/apiKey.repository';
import { AuditLogRepository } from '../repositories/auditLog.repository';
import { SecurityService } from './security.service';

export class CredentialService {
  private smtpRepo = new SmtpCredentialRepository();
  private apiKeyRepo = new ApiKeyRepository();
  private auditLogRepo = new AuditLogRepository();

  // --- SMTP Credentials API ---

  /**
   * Create SMTP credential.
   * If host is provided -> create an external SMTP credential storing host/port/secure/smtpUsername and encryptedPassword
   * If host is not provided -> keep legacy behavior of creating a local SMTP username/password (for Postfix relay auth)
   */
  async createSmtpCredential(workspaceId: string, input: { description?: string; host?: string; port?: number; secure?: boolean; smtpUsername?: string; password?: string; authenticationType?: 'plain'|'login'|'oauth' }) {
    const { description, host, port, secure, smtpUsername, password, authenticationType } = input || {};

    if (host) {
      // Create external SMTP credential
      if (!smtpUsername || typeof smtpUsername !== 'string' || smtpUsername.trim() === '') {
        throw new Error('smtpUsername is required when creating an external SMTP credential.');
      }
      if (!password || typeof password !== 'string') {
        throw new Error('password is required when creating an external SMTP credential.');
      }

      const encryptedPassword = SecurityService.encryptSecret(password);

      const credential = await this.smtpRepo.create({
        workspaceId: workspaceId as any,
        host: host.trim(),
        port: port || 587,
        secure: !!secure,
        smtpUsername: smtpUsername.trim(),
        encryptedPassword,
        authenticationType: authenticationType || 'plain',
        description,
        status: 'active',
      } as any);

      // Audit Log
      await this.auditLogRepo.create({
        workspaceId: workspaceId as any,
        action: 'smtp_credential.create_external',
        details: { host: credential.host, smtpUsername: credential.smtpUsername, description },
      } as any);

      // Do NOT return secrets
      return {
        credential: {
          id: credential.id,
          host: credential.host,
          port: credential.port,
          secure: credential.secure,
          smtpUsername: credential.smtpUsername,
          description: credential.description,
          status: credential.status,
          createdAt: credential.createdAt,
        }
      };
    }

    // Legacy/local credential path (generate username/password for local Postfix auth)
    const username = `smtp_${SecurityService.generateRandomString(8)}`;
    const plaintextPassword = SecurityService.generateRandomString(16);
    const passwordHash = await SecurityService.hashPassword(plaintextPassword);

    const credential = await this.smtpRepo.create({
      workspaceId: workspaceId as any,
      username,
      passwordHash,
      description,
      status: 'active',
    } as any);

    // Create Audit Log
    await this.auditLogRepo.create({
      workspaceId: workspaceId as any,
      action: 'smtp_credential.create_local',
      details: { username, description },
    } as any);

    return {
      credential: {
        id: credential.id,
        username: credential.username,
        description: credential.description,
        status: credential.status,
        createdAt: credential.createdAt,
      },
      plaintextPassword,
    };
  }

  async listSmtpCredentials(workspaceId: string) {
    const creds = await this.smtpRepo.findByWorkspace(workspaceId);
    return creds.map(c => ({
      id: c.id,
      // Show host/port when available; never expose password or encrypted data
      host: c.host,
      port: c.port,
      secure: c.secure,
      smtpUsername: c.smtpUsername,
      description: c.description,
      status: c.status,
      lastUsedAt: c.lastUsedAt,
      createdAt: c.createdAt,
    }));
  }

  async deleteSmtpCredential(workspaceId: string, credentialId: string) {
    const cred = await this.smtpRepo.findById(credentialId);
    if (!cred || cred.workspaceId.toString() !== workspaceId) {
      throw new Error('Credential not found.');
    }

    await this.smtpRepo.delete(credentialId);

    // Audit Log
    await this.auditLogRepo.create({
      workspaceId: workspaceId as any,
      action: 'smtp_credential.delete',
      details: { id: credentialId, host: cred.host || cred.username },
    } as any);

    return { success: true };
  }

  async regenerateSmtpPassword(workspaceId: string, credentialId: string) {
    const cred = await this.smtpRepo.findById(credentialId);
    if (!cred || cred.workspaceId.toString() !== workspaceId) {
      throw new Error('Credential not found.');
    }

    // If this is an external SMTP credential, regenerate and return nothing (user must provide their own real SMTP password normally).
    if (cred.host && cred.smtpUsername) {
      // Generate a new random password and store encrypted - useful for service-provided credentials
      const plaintextPassword = SecurityService.generateRandomString(16);
      const encryptedPassword = SecurityService.encryptSecret(plaintextPassword);
      cred.encryptedPassword = encryptedPassword;
      await cred.save();

      await this.auditLogRepo.create({
        workspaceId: workspaceId as any,
        action: 'smtp_credential.regenerate_password',
        details: { id: credentialId, host: cred.host },
      } as any);

      return { plaintextPassword };
    }

    // Legacy local credential path
    const plaintextPassword = SecurityService.generateRandomString(16);
    const passwordHash = await SecurityService.hashPassword(plaintextPassword);

    cred.passwordHash = passwordHash;
    await cred.save();

    // Audit Log
    await this.auditLogRepo.create({
      workspaceId: workspaceId as any,
      action: 'smtp_credential.regenerate_password',
      details: { username: cred.username },
    } as any);

    return { plaintextPassword };
  }

  async updateSmtpStatus(workspaceId: string, credentialId: string, status: 'active' | 'disabled') {
    const cred = await this.smtpRepo.findById(credentialId);
    if (!cred || cred.workspaceId.toString() !== workspaceId) {
      throw new Error('Credential not found.');
    }

    cred.status = status;
    await cred.save();

    // Audit Log
    await this.auditLogRepo.create({
      workspaceId: workspaceId as any,
      action: 'smtp_credential.update_status',
      details: { username: cred.username, status },
    } as any);

    return cred;
  }

  // --- API Key API ---

  async createApiKey(workspaceId: string, name: string, scopes: ('send' | 'read' | 'admin')[]) {
    const { rawKey, keyId, keyHash } = SecurityService.generateApiKey();

    const apiKey = await this.apiKeyRepo.create({
      workspaceId: workspaceId as any,
      apiKeyId: keyId,
      keyHash,
      name,
      scopes,
      status: 'active',
    } as any);

    // Audit Log
    await this.auditLogRepo.create({
      workspaceId: workspaceId as any,
      action: 'api_key.create',
      details: { apiKeyId: keyId, name, scopes },
    } as any);

    return {
      apiKey: {
        id: apiKey.id,
        apiKeyId: apiKey.apiKeyId,
        name: apiKey.name,
        scopes: apiKey.scopes,
        status: apiKey.status,
        createdAt: apiKey.createdAt,
      },
      rawKey, // Returned only once
    };
  }

  async listApiKeys(workspaceId: string) {
    const keys = await this.apiKeyRepo.findByWorkspace(workspaceId);
    return keys.map(k => ({
      id: k.id,
      apiKeyId: k.apiKeyId,
      name: k.name,
      scopes: k.scopes,
      status: k.status,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    }));
  }

  async updateApiKeyStatus(workspaceId: string, keyId: string, status: 'active' | 'disabled' | 'revoked') {
    const key = await this.apiKeyRepo.findById(keyId);
    if (!key || key.workspaceId.toString() !== workspaceId) {
      throw new Error('API Key not found.');
    }

    key.status = status;
    await key.save();

    // Audit Log
    await this.auditLogRepo.create({
      workspaceId: workspaceId as any,
      action: 'api_key.update_status',
      details: { apiKeyId: key.apiKeyId, status },
    } as any);

    return key;
  }
}
export default CredentialService;
