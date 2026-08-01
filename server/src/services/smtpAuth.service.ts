import { SmtpCredentialRepository } from '../repositories/smtpCredential.repository';
import { WorkspaceRepository } from '../repositories/workspace.repository';
import { AuditLogRepository } from '../repositories/auditLog.repository';
import { SecurityService } from './security.service';

// In-memory tracker for brute-force attempts
const loginFailuresMap = new Map<string, { count: number; blockedUntil: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes block

export class SmtpAuthService {
  private smtpRepo = new SmtpCredentialRepository();
  private workspaceRepo = new WorkspaceRepository();
  private auditLogRepo = new AuditLogRepository();

  /**
   * Validates SASL SMTP relay credentials.
   * Returns { authenticated: boolean, error?: string }
   */
  async authenticateSmtpUser(username: string, password: string, clientIp?: string): Promise<{ authenticated: boolean; error?: string }> {
    const trimmedUsername = username.trim();

    // 1. Check Brute-force protection block list
    const failureRecord = loginFailuresMap.get(trimmedUsername);
    if (failureRecord && Date.now() < failureRecord.blockedUntil) {
      const minutesLeft = Math.ceil((failureRecord.blockedUntil - Date.now()) / 60000);
      await this.auditLogRepo.create({
        action: 'smtp_auth.brute_force_block',
        details: { username: trimmedUsername, clientIp, reason: 'Brute-force limit exceeded.' },
      } as any);
      return { authenticated: false, error: `Account locked due to multiple failed login attempts. Try again in ${minutesLeft} minutes.` };
    }

    // 2. Lookup credential by username
    const credential = await this.smtpRepo.findByUsername(trimmedUsername);
    if (!credential) {
      await this.handleFailedAttempt(trimmedUsername, clientIp, 'Credential not found.');
      return { authenticated: false, error: 'Invalid SMTP username or password.' };
    }

    // 3. Verify workspace ownership and status
    const workspace = await this.workspaceRepo.findById(credential.workspaceId.toString());
    if (!workspace) {
      await this.handleFailedAttempt(trimmedUsername, clientIp, 'Workspace not found.');
      return { authenticated: false, error: 'Invalid workspace configuration.' };
    }

    // 4. Verify credential status limits
    if (credential.status === 'disabled') {
      await this.handleFailedAttempt(trimmedUsername, clientIp, 'Credential disabled.');
      return { authenticated: false, error: 'SMTP Credential has been disabled.' };
    }

    if (credential.isDeleted) {
      await this.handleFailedAttempt(trimmedUsername, clientIp, 'Credential deleted.');
      return { authenticated: false, error: 'SMTP Credential has been deleted.' };
    }

    // Future IP restriction hook
    // const matchesIpRestrictions = await this.checkIpRestrictions(credential, clientIp);
    // if (!matchesIpRestrictions) return { authenticated: false, error: 'IP address not allowed.' };

    // Future Rate limiting check hook
    // const rateLimitAllowed = await this.checkRateLimit(credential);
    // if (!rateLimitAllowed) return { authenticated: false, error: 'Rate limit exceeded.' };

    // 5. Secure Argon2 Password verification
    const passwordMatches = await SecurityService.verifyPassword(credential.passwordHash, password);
    if (!passwordMatches) {
      await this.handleFailedAttempt(trimmedUsername, clientIp, 'Incorrect password.');
      return { authenticated: false, error: 'Invalid SMTP username or password.' };
    }

    // 6. Success - Reset failure counters
    loginFailuresMap.delete(trimmedUsername);

    // Update last used timestamp
    credential.lastUsedAt = new Date();
    await credential.save();

    // Create Audit Log record
    await this.auditLogRepo.create({
      workspaceId: workspace.id,
      action: 'smtp_auth.success',
      details: { username: trimmedUsername, clientIp },
    } as any);

    return { authenticated: true };
  }

  private async handleFailedAttempt(username: string, clientIp?: string, reason?: string) {
    // Audit failure
    await this.auditLogRepo.create({
      action: 'smtp_auth.failure',
      details: { username, clientIp, reason },
    } as any);

    // Update brute-force tracking counters
    const now = Date.now();
    const record = loginFailuresMap.get(username) || { count: 0, blockedUntil: 0 };
    record.count += 1;

    if (record.count >= MAX_FAILED_ATTEMPTS) {
      record.blockedUntil = now + BLOCK_DURATION_MS;
      console.warn(`[SmtpAuthService] Account ${username} locked due to brute force protection.`);
    }

    loginFailuresMap.set(username, record);
  }
}
export default SmtpAuthService;
