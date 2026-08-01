import crypto from 'crypto';
import * as argon2 from 'argon2';

export class SecurityService {
  /**
   * Hashes a password using Argon2id.
   */
  static async hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }

  /**
   * Verifies a password against an Argon2 hash.
   */
  static async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (e) {
      return false;
    }
  }

  /**
   * Generates a strong cryptographically secure random string.
   */
  static generateRandomString(bytesCount = 16): string {
    return crypto.randomBytes(bytesCount).toString('hex');
  }

  /**
   * Generates a unique API Key pair.
   * Returns { rawKey: string, keyId: string, keyHash: string }
   * Format: ghst_live_keyId.rawSecret
   */
  static generateApiKey(): { rawKey: string; keyId: string; keyHash: string } {
    const keyId = crypto.randomBytes(8).toString('hex'); // 16 characters prefix
    const rawSecret = crypto.randomBytes(24).toString('hex'); // 48 characters secret
    const rawKey = `ghst_live_${keyId}.${rawSecret}`;
    
    // Hash key using SHA-256 for secure DB storage
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    return { rawKey, keyId, keyHash };
  }

  /**
   * Hashes an API Key raw string for comparison lookup.
   */
  static hashApiKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  /**
   * Perform timing-safe string comparison.
   */
  static timingSafeCompare(str1: string, str2: string): boolean {
    const buffer1 = Buffer.from(str1);
    const buffer2 = Buffer.from(str2);
    
    if (buffer1.length !== buffer2.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(buffer1, buffer2);
  }
}
export default SecurityService;
