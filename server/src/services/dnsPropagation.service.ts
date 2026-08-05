import dns from 'dns';
import { DnsCheckInput } from './dnsLookup.service';

export interface ResolverStatus {
  name: string;
  ip: string;
  verified: boolean;
  value?: string;
  error?: string;
}

export interface PropagationStatus {
  record: string;
  label: string;
  type: string;
  host: string;
  expected: string;
  propagationPercentage: number;
  resolvers: ResolverStatus[];
  fullyPropagated: boolean;
  estimatedMinutesToFull: number;
}

/**
 * DNS Propagation checker using multiple public resolvers.
 * Measures how widely a DNS record has propagated across the internet.
 */
export class DnsPropagationService {
  private readonly resolvers = [
    { name: 'Google', ip: '8.8.8.8' },
    { name: 'Cloudflare', ip: '1.1.1.1' },
    { name: 'Quad9', ip: '9.9.9.9' },
    { name: 'OpenDNS', ip: '208.67.222.222' },
  ];

  private dnsPromises = dns.promises;

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

  /**
   * Check a single record against all public resolvers.
   * Returns propagation percentage and per-resolver status.
   */
  async checkPropagation(input: DnsCheckInput): Promise<PropagationStatus> {
    const resolverResults = await Promise.all(
      this.resolvers.map((resolver) => this.checkResolver(resolver, input))
    );

    const verifiedCount = resolverResults.filter((r) => r.verified).length;
    const propagationPercentage = Math.round(
      (verifiedCount / resolverResults.length) * 100
    );
    const fullyPropagated = propagationPercentage === 100;

    // Estimate time to full propagation (empirical: typically 15-60 minutes)
    const estimatedMinutesToFull = fullyPropagated ? 0 : 30;

    return {
      record: input.record,
      label: input.label,
      type: input.type,
      host: input.host,
      expected: input.expected,
      propagationPercentage,
      resolvers: resolverResults,
      fullyPropagated,
      estimatedMinutesToFull,
    };
  }

  /**
   * Check propagation for multiple records in parallel.
   */
  async checkAllPropagation(
    inputs: DnsCheckInput[]
  ): Promise<PropagationStatus[]> {
    return Promise.all(inputs.map((input) => this.checkPropagation(input)));
  }

  /**
   * Check a single record against a specific resolver.
   */
  private async checkResolver(
    resolver: { name: string; ip: string },
    input: DnsCheckInput
  ): Promise<ResolverStatus> {
    try {
      // Create resolver with specific nameserver
      const resolver_inst = new dns.Resolver();
      resolver_inst.setServers([resolver.ip]);

      let value: string | undefined;
      let match = false;

      switch (input.type) {
        case 'TXT':
          value = await this.checkTxt(resolver_inst, input);
          match = this.matchTxt(value, input.expected);
          break;
        case 'MX':
          value = await this.checkMx(resolver_inst, input);
          match = this.matchMx(value, input.expected);
          break;
        case 'CNAME':
          value = await this.checkCname(resolver_inst, input);
          match = this.matchCname(value, input.expected);
          break;
        case 'A':
          value = await this.checkA(resolver_inst, input);
          match = this.matchA(value, input.expected);
          break;
        case 'AAAA':
          value = await this.checkAAAA(resolver_inst, input);
          match = this.matchAAAA(value, input.expected);
          break;
        case 'SRV':
          value = await this.checkSrv(resolver_inst, input);
          match = this.matchSrv(value, input.expected);
          break;
        case 'CAA':
          value = await this.checkCAA(resolver_inst, input);
          match = this.matchCAA(value, input.expected);
          break;
        default:
          return {
            name: resolver.name,
            ip: resolver.ip,
            verified: false,
            error: `Unsupported record type: ${input.type}`,
          };
      }

      return {
        name: resolver.name,
        ip: resolver.ip,
        verified: match,
        value: value || undefined,
        error: match ? undefined : 'Record not found or value mismatch',
      };
    } catch (err: any) {
      return {
        name: resolver.name,
        ip: resolver.ip,
        verified: false,
        error: err?.message || 'DNS lookup failed',
      };
    }
  }

  private async checkTxt(resolver: dns.Resolver, input: DnsCheckInput): Promise<string | null> {
    try {
      const records = await resolver.resolveTxt(input.host);
      return records.map((chunks) => chunks.join('')).join(';');
    } catch {
      return null;
    }
  }

  private async checkMx(resolver: dns.Resolver, input: DnsCheckInput): Promise<string | null> {
    try {
      const records = await resolver.resolveMx(input.host);
      return records.map((r) => `${r.priority} ${r.exchange}`).join(';');
    } catch {
      return null;
    }
  }

  private async checkCname(resolver: dns.Resolver, input: DnsCheckInput): Promise<string | null> {
    try {
      const records = await resolver.resolveCname(input.host);
      return records.join(';');
    } catch {
      return null;
    }
  }

  private async checkA(resolver: dns.Resolver, input: DnsCheckInput): Promise<string | null> {
    try {
      const records = await resolver.resolve4(input.host);
      return records.join(';');
    } catch {
      return null;
    }
  }

  private async checkAAAA(resolver: dns.Resolver, input: DnsCheckInput): Promise<string | null> {
    try {
      const records = await resolver.resolve6(input.host);
      return records.join(';');
    } catch {
      return null;
    }
  }

  private async checkSrv(resolver: dns.Resolver, input: DnsCheckInput): Promise<string | null> {
    try {
      const records = await resolver.resolveSrv(input.host);
      return records
        .map((r) => `${r.priority} ${r.weight} ${r.port} ${r.name}`)
        .join(';');
    } catch {
      return null;
    }
  }

  private async checkCAA(resolver: dns.Resolver, input: DnsCheckInput): Promise<string | null> {
    try {
      const records = await resolver.resolveCaa(input.host);
      return records
        .map((r) => `${r.critical} ${r.issue || r.issuewild || r.iodef || ''} "${r.value}"`)
        .join(';');
    } catch {
      return null;
    }
  }

  private matchTxt(actual: string | null, expected: string): boolean {
    if (!actual) return false;
    const expectedNorm = this.norm(expected);
    const actualNorm = this.norm(actual);

    // For SPF, DKIM, DMARC: check key tokens
    if (expectedNorm.includes('v=spf1')) {
      return actualNorm.includes('v=spf1');
    }
    if (expectedNorm.includes('v=dkim1')) {
      return actualNorm.includes('v=dkim1') && actualNorm.includes('p=');
    }
    if (expectedNorm.includes('v=dmarc1')) {
      return actualNorm.includes('v=dmarc1') && actualNorm.includes('p=');
    }

    return actualNorm.includes(expectedNorm);
  }

  private matchMx(actual: string | null, expected: string): boolean {
    if (!actual) return false;
    const expectedParts = expected.split(' ');
    const expectedPriority = expectedParts[0];
    const expectedHost = this.normHost(expectedParts.slice(1).join(' '));
    return actual.includes(expectedPriority) && actual.includes(expectedHost);
  }

  private matchCname(actual: string | null, expected: string): boolean {
    if (!actual) return false;
    return this.normHost(actual) === this.normHost(expected);
  }

  private matchA(actual: string | null, expected: string): boolean {
    if (!actual) return false;
    return actual.includes(expected);
  }

  private matchAAAA(actual: string | null, expected: string): boolean {
    if (!actual) return false;
    return actual.includes(expected);
  }

  private matchSrv(actual: string | null, expected: string): boolean {
    if (!actual) return false;
    return this.norm(actual) === this.norm(expected);
  }

  private matchCAA(actual: string | null, expected: string): boolean {
    if (!actual) return false;
    return this.norm(actual).includes(this.norm(expected));
  }
}

export default DnsPropagationService;
