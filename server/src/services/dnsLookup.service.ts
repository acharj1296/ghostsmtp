import dns from 'dns';

// Verify against public resolvers so we measure what the world sees, not the
// local container DNS. Fall back to system resolvers if the public ones fail.
try {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
} catch {
  // system resolvers remain in effect
}

const dnsPromises = dns.promises;

export type DnsCheckType = 'TXT' | 'MX' | 'CNAME' | 'SRV';

export interface DnsCheckResult {
  /** Stable key, e.g. 'spf', 'dkim', 'dmarc', 'mx', 'tracking'. */
  record: string;
  /** Human-readable label for UI display. */
  label: string;
  type: DnsCheckType;
  host: string;
  expected: string;
  /** The DNS value that actually matched (normalized), or null. */
  actual: string | null;
  /** Everything the resolver returned for this name/type. */
  allActual: string[];
  verified: boolean;
  error?: string;
}

export interface DnsCheckInput {
  record: string;
  label: string;
  type: DnsCheckType;
  host: string;
  expected: string;
}

/**
 * Production-grade live DNS verification. Performs real lookups against public
 * resolvers and compares expected (what the user should publish) vs actual
 * (what DNS currently returns), with normalized, forgiving matching.
 */
export class DnsLookupService {
  // --- Normalization helpers -------------------------------------------------

  private norm(v: string): string {
    return v
      .replace(/\s+/g, '')
      .replace(/^"|"$/g, '')
      .replace(/\.$/, '')
      .toLowerCase();
  }

  private normHost(v: string): string {
    return v.replace(/\.$/, '').toLowerCase();
  }

  // --- Raw lookups -----------------------------------------------------------

  private async lookupTxt(host: string): Promise<string[]> {
    try {
      const records = await dnsPromises.resolveTxt(host);
      return records.map((chunks) => chunks.join(''));
    } catch (err: any) {
      throw new Error(this.describeDnsError(host, 'TXT', err));
    }
  }

  private async lookupMx(host: string): Promise<{ exchange: string; priority: number }[]> {
    try {
      return await dnsPromises.resolveMx(host);
    } catch (err: any) {
      throw new Error(this.describeDnsError(host, 'MX', err));
    }
  }

  private async lookupCname(host: string): Promise<string[]> {
    try {
      return await dnsPromises.resolveCname(host);
    } catch (err: any) {
      throw new Error(this.describeDnsError(host, 'CNAME', err));
    }
  }

  private async lookupSrv(host: string): Promise<string[]> {
    try {
      const records = await dnsPromises.resolveSrv(host);
      return records.map((r) => `${r.priority} ${r.weight} ${r.port} ${r.name}`);
    } catch (err: any) {
      throw new Error(this.describeDnsError(host, 'SRV', err));
    }
  }

  private describeDnsError(host: string, type: DnsCheckType, err: any): string {
    const code = err?.code;
    if (code === 'ENOTFOUND' || code === 'ENODATA' || code === 'NXDOMAIN') {
      return `No ${type} record published for ${host} yet (or DNS has not propagated).`;
    }
    if (code === 'ETIMEOUT' || code === 'ETIMEDOUT') {
      return `DNS lookup timed out for ${host}.`;
    }
    return `DNS lookup failed for ${host} (${code || err?.message || 'unknown error'}).`;
  }

  // --- Per-type verification -------------------------------------------------

  private async verifyTxt(input: DnsCheckInput): Promise<DnsCheckResult> {
    const all = await this.lookupTxt(input.host);
    return this.compareTxt(input, all);
  }

  private compareTxt(input: DnsCheckInput, all: string[]): DnsCheckResult {
    const normalized = all.map((r) => this.norm(r));
    const expectedNorm = this.norm(input.expected);

    // SPF: match v=spf1 and the include: token (forgiving to allow extra mechs).
    if (input.record === 'spf') {
      const includeToken = `include:${expectedNorm.split('include:')[1]?.split('~all')[0] || ''}`;
      const match = normalized.find(
        (r) => r.includes('v=spf1') && (includeToken === 'include:' ? true : r.includes(includeToken))
      );
      return this.build(input, all, match || null);
    }

    // DKIM: match v=DKIM1 and the public key value (p=...).
    if (input.record === 'dkim') {
      const keyToken = expectedNorm.split('p=')[1] || '';
      const match = normalized.find((r) => r.includes('v=dkim1') && r.includes(`p=${keyToken}`));
      return this.build(input, all, match || null);
    }

    // DMARC: match v=DMARC1 and the declared policy.
    if (input.record === 'dmarc') {
      const policyToken = expectedNorm.split('p=')[1]?.split(';')[0] || '';
      const match = normalized.find((r) => r.includes('v=dmarc1') && r.includes(`p=${policyToken}`));
      return this.build(input, all, match || null);
    }

    // Generic TXT: normalized substring containment.
    const match = normalized.find((r) => r.includes(expectedNorm));
    return this.build(input, all, match || null);
  }

  private async verifyMx(input: DnsCheckInput): Promise<DnsCheckResult> {
    const records = await this.lookupMx(input.host);
    const expectedTarget = this.normHost(input.expected.split(' ').pop() || '');
    const expectedPriority = parseInt(input.expected.split(' ')[0] || '10', 10);

    const matching = records.find((r) => {
      const exchangeOk = this.normHost(r.exchange) === expectedTarget;
      const priorityOk = isNaN(expectedPriority) || r.priority === expectedPriority;
      return exchangeOk && priorityOk;
    });

    const actualValues = records.map((r) => `${r.priority} ${r.exchange}`);
    return this.build(input, actualValues, matching ? `${matching.priority} ${matching.exchange}` : null);
  }

  private async verifyCname(input: DnsCheckInput): Promise<DnsCheckResult> {
    const targets = await this.lookupCname(input.host);
    const expectedNorm = this.normHost(input.expected);
    const match = targets.find((t) => this.normHost(t) === expectedNorm) || null;
    return this.build(input, targets, match);
  }

  private async verifySrv(input: DnsCheckInput): Promise<DnsCheckResult> {
    const records = await this.lookupSrv(input.host);
    const expectedNorm = this.norm(input.expected);
    const match = records.find((r) => this.norm(r) === expectedNorm) || null;
    return this.build(input, records, match);
  }

  private build(input: DnsCheckInput, all: string[], matched: string | null): DnsCheckResult {
    return {
      record: input.record,
      label: input.label,
      type: input.type,
      host: input.host,
      expected: input.expected,
      actual: matched,
      allActual: all,
      verified: !!matched,
      error: matched ? undefined : this.mismatchMessage(input, all),
    };
  }

  private mismatchMessage(input: DnsCheckInput, all: string[]): string {
    if (all.length === 0) {
      return `No ${input.type} record found for ${input.host}.`;
    }
    return `Expected value "${input.expected}" was not found. Current DNS returns: ${all.join('; ')}.`;
  }

  /**
   * Verify a single check against live DNS.
   */
  async verify(input: DnsCheckInput): Promise<DnsCheckResult> {
    switch (input.type) {
      case 'MX':
        return this.verifyMx(input);
      case 'CNAME':
        return this.verifyCname(input);
      case 'SRV':
        return this.verifySrv(input);
      case 'TXT':
      default:
        return this.verifyTxt(input);
    }
  }

  /**
   * Run a set of checks concurrently and return detailed per-record results.
   * Failed lookups are returned as unverified results (never throw) so the
   * caller always gets a complete picture.
   */
  async verifyAll(inputs: DnsCheckInput[]): Promise<DnsCheckResult[]> {
    const results = await Promise.all(
      inputs.map(async (input) => {
        try {
          return await this.verify(input);
        } catch (err: any) {
          return {
            record: input.record,
            label: input.label,
            type: input.type,
            host: input.host,
            expected: input.expected,
            actual: null,
            allActual: [],
            verified: false,
            error: err?.message || 'DNS lookup failed.',
          } as DnsCheckResult;
        }
      })
    );
    return results;
  }
}

export default DnsLookupService;
