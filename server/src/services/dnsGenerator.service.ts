import { env } from '../config/env';

/**
 * A single DNS record that a customer must publish on their zone.
 * `value` is the exact RDATA string to display in the DNS provider UI.
 */
export interface DnsRecord {
  type: 'TXT' | 'CNAME' | 'MX' | 'SRV';
  /** Fully-qualified host name the record belongs to (e.g. `track.example.com`). */
  host: string;
  /** Record value (already formatted for the customer). */
  value: string;
  /** MX priority (only set for MX records). */
  priority?: number;
  /** Recommended TTL in seconds. */
  ttl: number;
}

/** Per-domain overrides; all optional and fall back to infrastructure env. */
export interface DnsGenerationOptions {
  selector?: string;
  trackingPrefix?: string;
  bouncePrefix?: string;
  returnPathPrefix?: string;
  autoconfigPrefix?: string;
  dmarcPolicy?: 'none' | 'quarantine' | 'reject';
}

/**
 * The complete set of DNS records generated for a single customer domain,
 * derived from the ACTUAL mail infrastructure configuration (env) rather than
 * hard-coded placeholders. Both display-friendly `DnsRecord`s and raw string
 * values (for DB persistence) are provided.
 */
export interface GeneratedDnsSet {
  spf: DnsRecord;
  dkim: DnsRecord;
  dmarc: DnsRecord;
  mx: DnsRecord;
  trackingCname: DnsRecord;
  bounceCname: DnsRecord;
  returnPath: DnsRecord;
  autoconfigCname: DnsRecord;
  autodiscoverSrv: DnsRecord;
  /** Raw string values persisted to the DomainVerification document. */
  raw: {
    spf: string;
    dkim: string;
    dmarc: string;
    mx: string;
    trackingCname: string;
    bounceCname: string;
    returnPath: string;
    autoconfigCname: string;
    autodiscoverRecord: string;
    /** Envelope MAIL FROM domain (VERP / bounce handling). */
    mailFrom: string;
  };
}

export class DnsGeneratorService {
  private resolveOpts(opts?: DnsGenerationOptions) {
    return {
      selector: opts?.selector ?? env.DEFAULT_DKIM_SELECTOR ?? 'ghost',
      trackingPrefix: opts?.trackingPrefix ?? env.TRACKING_SUBDOMAIN ?? 'track',
      bouncePrefix: opts?.bouncePrefix ?? env.BOUNCE_SUBDOMAIN ?? 'bounce',
      returnPathPrefix: opts?.returnPathPrefix ?? opts?.bouncePrefix ?? env.BOUNCE_SUBDOMAIN ?? 'bounce',
      autoconfigPrefix: opts?.autoconfigPrefix ?? env.AUTOCONFIG_SUBDOMAIN ?? 'autoconfig',
      dmarcPolicy: opts?.dmarcPolicy ?? 'none',
    };
  }

  /**
   * Generate the full DNS record set for a customer domain from the running
   * mail infrastructure. Deterministic — the same domain always yields the
   * same records for a given infrastructure configuration.
   */
  generateForDomain(domainName: string, dkimPublicKey: string, opts?: DnsGenerationOptions): GeneratedDnsSet {
    const o = this.resolveOpts(opts);
    const ttl = 3600;

    const mailHost = env.MAIL_SERVER_HOST;
    const base = env.MAIL_BASE_DOMAIN;

    const trackingHost = `${o.trackingPrefix}.${domainName}`;
    const bounceHost = `${o.bouncePrefix}.${domainName}`;
    const returnPathHost = `${o.returnPathPrefix}.${domainName}`;
    const autoconfigHost = `${o.autoconfigPrefix}.${domainName}`;

    // --- SPF: reflects the actual mail server IP + include base domain ---
    const ipPart = env.MAIL_SERVER_IP ? ` ip4:${env.MAIL_SERVER_IP}` : '';
    const spfValue = `v=spf1${ipPart} include:${base} mx ~all`;

    // --- DKIM: real public key from the generated OpenDKIM keypair ---
    const dkimHost = `${o.selector}._domainkey.${domainName}`;
    const dkimValue = `v=DKIM1; k=rsa; p=${dkimPublicKey}`;

    // --- DMARC: production policy, provider-collected aggregate/abuse reports ---
    const dmarcHost = `_dmarc.${domainName}`;
    const dmarcValue = this.buildDmarc(o.dmarcPolicy);

    // --- MX: point at the real mail server ---
    const mxValue = `10 ${mailHost}`;

    // --- Tracking + Bounce CNAMEs: hosted provider subdomains ---
    const trackingCnameValue = `${o.trackingPrefix}.${base}`;
    const bounceCnameValue = `${o.bouncePrefix}.${base}`;

    // --- Return-path / MAIL FROM: bounce subdomain ---
    const returnPathValue = `${o.returnPathPrefix}.${base}`;

    // --- Autoconfig (Mozilla / Apple) + Autodiscover (Outlook) ---
    const autoconfigCnameValue = `${o.autoconfigPrefix}.${base}`;
    const autodiscoverValue = `0 0 443 autodiscover.${base}`;

    return {
      spf: { type: 'TXT', host: '@', value: spfValue, ttl },
      dkim: { type: 'TXT', host: dkimHost, value: dkimValue, ttl },
      dmarc: { type: 'TXT', host: dmarcHost, value: dmarcValue, ttl },
      mx: { type: 'MX', host: domainName, value: mxValue, priority: 10, ttl },
      trackingCname: { type: 'CNAME', host: trackingHost, value: trackingCnameValue, ttl },
      bounceCname: { type: 'CNAME', host: bounceHost, value: bounceCnameValue, ttl },
      returnPath: { type: 'CNAME', host: returnPathHost, value: returnPathValue, ttl },
      autoconfigCname: { type: 'CNAME', host: autoconfigHost, value: autoconfigCnameValue, ttl },
      autodiscoverSrv: { type: 'SRV', host: `_autodiscover._tcp.${domainName}`, value: autodiscoverValue, ttl },
      raw: {
        spf: spfValue,
        dkim: dkimValue,
        dmarc: dmarcValue,
        mx: mxValue,
        trackingCname: trackingCnameValue,
        bounceCname: bounceCnameValue,
        returnPath: returnPathValue,
        autoconfigCname: autoconfigCnameValue,
        autodiscoverRecord: autodiscoverValue,
        mailFrom: returnPathHost,
      },
    };
  }

  /**
   * Build a production-ready DMARC record. Policy is configurable so customers
   * can graduate from `none` → `quarantine` → `reject` as they warm up.
   */
  buildDmarc(policy: 'none' | 'quarantine' | 'reject' = 'none'): string {
    return [
      'v=DMARC1',
      `p=${policy}`,
      `rua=mailto:${env.DMARC_RUA}`,
      `ruf=mailto:${env.DMARC_RUF}`,
      'adkim=s',
      'aspf=s',
      'fo=1',
      'pct=100',
    ].join('; ');
  }
}

export default DnsGeneratorService;
