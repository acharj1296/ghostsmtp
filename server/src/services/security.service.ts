import crypto from 'crypto';
import * as argon2 from 'argon2';
import { env } from '../config/env';

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

  /**
   * Encrypt a secret using AES-256-GCM with a server-side ENCRYPTION_KEY.
   * Returns base64 encoded string containing iv||tag||ciphertext
   */
  static encryptSecret(plainText: string): string {
    const keyRaw = process.env.ENCRYPTION_KEY || env.ENCRYPTION_KEY || '';
    if (!keyRaw || keyRaw.length < 16) {
      throw new Error('Server encryption key not configured. Set ENCRYPTION_KEY in environment.');
    }

    // Normalize to 32-byte key
    const key = crypto.createHash('sha256').update(keyRaw).digest();
    const iv = crypto.randomBytes(12); // recommended for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(Buffer.from(plainText, 'utf8')), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Store as iv|tag|ciphertext
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  /**
   * Decrypt an encrypted secret produced by encryptSecret.
   */
  static decryptSecret(secretB64: string): string {
    const keyRaw = process.env.ENCRYPTION_KEY || env.ENCRYPTION_KEY || '';
    if (!keyRaw || keyRaw.length < 16) {
      throw new Error('Server encryption key not configured. Set ENCRYPTION_KEY in environment.');
    }

    const key = crypto.createHash('sha256').update(keyRaw).digest();
    const data = Buffer.from(secretB64, 'base64');

    const iv = data.slice(0, 12);
    const tag = data.slice(12, 28);
    const ciphertext = data.slice(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    return decrypted.toString('utf8');
  }
}
export default SecurityService;
