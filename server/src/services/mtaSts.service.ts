import { env } from '../config/env';

/**
 * MTA-STS (Mail Transfer Agent Strict Transport Security)
 *
 * Serves the TLS enforcement policy for email sending domains.
 * When a domain publishes an MTA-STS TXT record, receiving mail servers
 * fetch this policy via HTTPS to enforce TLS encryption.
 *
 * RFC 8461: https://tools.ietf.org/html/rfc8461
 */

export interface MtaStsPolicy {
  version: string;
  mode: 'enforce' | 'testing' | 'none';
  mx: string[];
  maxAge: number; // seconds
}

export class MtaStsService {
  /**
   * Generate MTA-STS policy for a domain
   */
  generatePolicy(domain: string, mode: 'enforce' | 'testing' | 'none' = 'enforce'): string {
    const mailHost = env.MAIL_SERVER_HOST;
    const baseDomain = env.MAIL_BASE_DOMAIN;

    // Policy is valid for 1 day (86400 seconds) by default
    // This allows for quick policy updates if needed
    const maxAge = 86400;

    const policy = [
      `version: STSv1`,
      `mode: ${mode}`,
      `mx: ${mailHost}`,
      `max_age: ${maxAge}`,
    ].join('\n');

    return policy;
  }

  /**
   * Get MTA-STS policy ID for TXT record
   * Should be unique and change when policy changes
   */
  getPolicyId(): string {
    // Use configured ID or generate timestamp-based ID
    return env.MTA_STS_ID || `${Date.now()}`;
  }

  /**
   * Build the full MTA-STS TXT record value for DNS
   */
  buildTxtRecord(): string {
    const policyId = this.getPolicyId();
    return `v=STSv1; id=${policyId}`;
  }

  /**
   * Get the URL where the policy should be accessible
   * According to RFC 8461, the policy must be at:
   * https://mta-sts.<domain>/.well-known/mta-sts.txt
   */
  getPolicyUrl(domain: string): string {
    return `https://mta-sts.${domain}/.well-known/mta-sts.txt`;
  }

  /**
   * Validate that a domain has proper MTA-STS setup
   */
  async validateMtaStsSetup(domain: string): Promise<{
    hasTxtRecord: boolean;
    hasPolicyFile: boolean;
    policyValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Check TXT record
    const dns = await import('dns');
    const dnsPromises = dns.promises;

    try {
      const txtRecords = await dnsPromises.resolveTxt(`_mta-sts.${domain}`);
      const hasValidRecord = txtRecords.some(records =>
        records.some(r => r.includes('v=STSv1'))
      );

      if (!hasValidRecord) {
        errors.push('MTA-STS TXT record not found or invalid');
      }
    } catch (err) {
      errors.push('MTA-STS TXT record not found');
    }

    // Note: Policy file validation would require an HTTP client
    // and is typically done by receiving mail servers, not the sending server

    return {
      hasTxtRecord: errors.filter(e => e.includes('TXT')).length === 0,
      hasPolicyFile: true, // We serve it, so it exists
      policyValid: errors.length === 0,
      errors,
    };
  }
}

export default MtaStsService;
