import { env } from '../config/env';

/**
 * A single DNS record that a customer must publish on their zone.
 * `value` is the exact RDATA string to display in the DNS provider UI.
 */
export interface DnsRecord {
  type: 'TXT' | 'CNAME' | 'MX' | 'SRV' | 'A' | 'AAAA' | 'CAA';
  /** Fully-qualified host name the record belongs to (e.g. `track.example.com`). */
  host: string;
  /** Record value (already formatted for the customer). */
  value: string;
  /** MX priority (only set for MX records). */
  priority?: number;
  /** Recommended TTL in seconds. */
  ttl: number;
  /** Human-readable purpose/description for UI display. */
  purpose?: string;
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
  // Core email authentication
  spf: DnsRecord;
  dkim: DnsRecord;
  dmarc: DnsRecord;
  mx: DnsRecord;

  // Infrastructure records
  mailA: DnsRecord;
  mailAAAA?: DnsRecord; // Optional IPv6

  // Tracking & bounce handling
  trackingCname: DnsRecord;
  bounceCname: DnsRecord;
  returnPath: DnsRecord;

  // Email client autoconfig
  autoconfigCname: DnsRecord;
  autodiscoverSrv: DnsRecord;

  // Mail host CNAMEs (smtp, imap, pop3, webmail)
  smtpCname: DnsRecord;
  imapCname: DnsRecord;
  pop3Cname: DnsRecord;
  webmailCname: DnsRecord;

  // Security & compliance
  mtaSts: DnsRecord;
  tlsRpt: DnsRecord;
  caa?: DnsRecord; // Optional
  bimi?: DnsRecord; // Optional

  /** Raw string values persisted to the DomainVerification document. */
  raw: {
    spf: string;
    dkim: string;
    dmarc: string;
    mx: string;
    mailA: string;
    mailAAAA?: string;
    trackingCname: string;
    bounceCname: string;
    returnPath: string;
    autoconfigCname: string;
    autodiscoverRecord: string;
    smtpCname: string;
    imapCname: string;
    pop3Cname: string;
    webmailCname: string;
    mtaSts: string;
    tlsRpt: string;
    caa?: string;
    bimi?: string;
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
    const mailIp = env.MAIL_SERVER_IP || '';
    const mailIpv6 = env.MAIL_SERVER_IPV6 || '';

    const trackingHost = `${o.trackingPrefix}.${domainName}`;
    const bounceHost = `${o.bouncePrefix}.${domainName}`;
    const returnPathHost = `${o.returnPathPrefix}.${domainName}`;
    const autoconfigHost = `${o.autoconfigPrefix}.${domainName}`;

    // --- SPF: reflects the actual mail server IP + include base domain ---
    const ipPart = mailIp ? ` ip4:${mailIp}` : '';
    const ipv6Part = mailIpv6 ? ` ip6:${mailIpv6}` : '';
    const spfValue = `v=spf1${ipPart}${ipv6Part} include:${base} mx ~all`;

    // --- DKIM: real public key from the generated OpenDKIM keypair ---
    const dkimHost = `${o.selector}._domainkey.${domainName}`;
    const dkimValue = `v=DKIM1; k=rsa; p=${dkimPublicKey}`;

    // --- DMARC: production policy, provider-collected aggregate/abuse reports ---
    const dmarcHost = `_dmarc.${domainName}`;
    const dmarcValue = this.buildDmarc(o.dmarcPolicy);

    // --- MX: point at the real mail server ---
    const mxValue = `10 ${mailHost}`;

    // --- A Record: mail server IPv4 ---
    const mailAHost = `mail.${domainName}`;
    const mailAValue = mailIp || mailHost; // Fallback to hostname if no IP

    // --- AAAA Record: mail server IPv6 (optional) ---
    const mailAAAAHost = `mail.${domainName}`;
    const mailAAAAValue = mailIpv6;

    // --- Tracking + Bounce CNAMEs: hosted provider subdomains ---
    const trackingCnameValue = `${o.trackingPrefix}.${base}`;
    const bounceCnameValue = `${o.bouncePrefix}.${base}`;

    // --- Return-path / MAIL FROM: bounce subdomain ---
    const returnPathValue = `${o.returnPathPrefix}.${base}`;

    // --- Autoconfig (Mozilla / Apple) + Autodiscover (Outlook) ---
    const autoconfigCnameValue = `${o.autoconfigPrefix}.${base}`;
    const autodiscoverValue = `0 0 443 autodiscover.${base}`;

    // --- SMTP, IMAP, POP3, Webmail CNAMEs ---
    const smtpHost = `smtp.${domainName}`;
    const smtpValue = mailHost;
    const imapHost = `imap.${domainName}`;
    const imapValue = mailHost;
    const pop3Host = `pop.${domainName}`;
    const pop3Value = mailHost;
    const webmailHost = `webmail.${domainName}`;
    const webmailValue = mailHost;

    // --- MTA-STS: TLS enforcement policy ---
    const mtaStsHost = `_mta-sts.${domainName}`;
    const mtaStsId = env.MTA_STS_ID || `${Date.now()}`;
    const mtaStsValue = `v=STSv1; id=${mtaStsId}`;

    // --- TLS-RPT: TLS reporting ---
    const tlsRptHost = `_smtp._tls.${domainName}`;
    const tlsRptEmail = env.TLS_RPT_EMAIL || `tls-reports@${base}`;
    const tlsRptValue = `v=TLSRPTv1; rua=mailto:${tlsRptEmail}`;

    // --- CAA: Certificate Authority Authorization (optional) ---
    const caaValue = env.CAA_RECORD || '0 issue "letsencrypt.org"';

    // --- BIMI: Brand Indicators for Message Identification (optional) ---
    const bimiHost = `default._bimi.${domainName}`;
    const bimiLogoUrl = env.BIMI_LOGO_URL || '';
    const bimiValue = bimiLogoUrl ? `v=BIMI1; l=${bimiLogoUrl}` : '';

    const result: GeneratedDnsSet = {
      spf: { type: 'TXT', host: '@', value: spfValue, ttl, purpose: 'Email sender authentication' },
      dkim: { type: 'TXT', host: dkimHost, value: dkimValue, ttl, purpose: 'Email signature verification' },
      dmarc: { type: 'TXT', host: dmarcHost, value: dmarcValue, ttl, purpose: 'Email authentication policy' },
      mx: { type: 'MX', host: domainName, value: mxValue, priority: 10, ttl, purpose: 'Mail server routing' },
      mailA: { type: 'A', host: mailAHost, value: mailAValue, ttl, purpose: 'Mail server IPv4 address' },
      trackingCname: { type: 'CNAME', host: trackingHost, value: trackingCnameValue, ttl, purpose: 'Email open/click tracking' },
      bounceCname: { type: 'CNAME', host: bounceHost, value: bounceCnameValue, ttl, purpose: 'Bounce handling' },
      returnPath: { type: 'CNAME', host: returnPathHost, value: returnPathValue, ttl, purpose: 'Return-Path for bounce handling' },
      autoconfigCname: { type: 'CNAME', host: autoconfigHost, value: autoconfigCnameValue, ttl, purpose: 'Email client autoconfiguration' },
      autodiscoverSrv: { type: 'SRV', host: `_autodiscover._tcp.${domainName}`, value: autodiscoverValue, ttl, purpose: 'Outlook autodiscovery' },
      smtpCname: { type: 'CNAME', host: smtpHost, value: smtpValue, ttl, purpose: 'SMTP server access' },
      imapCname: { type: 'CNAME', host: imapHost, value: imapValue, ttl, purpose: 'IMAP server access' },
      pop3Cname: { type: 'CNAME', host: pop3Host, value: pop3Value, ttl, purpose: 'POP3 server access' },
      webmailCname: { type: 'CNAME', host: webmailHost, value: webmailValue, ttl, purpose: 'Webmail interface' },
      mtaSts: { type: 'TXT', host: mtaStsHost, value: mtaStsValue, ttl, purpose: 'TLS enforcement policy' },
      tlsRpt: { type: 'TXT', host: tlsRptHost, value: tlsRptValue, ttl, purpose: 'TLS reporting' },
      raw: {
        spf: spfValue,
        dkim: dkimValue,
        dmarc: dmarcValue,
        mx: mxValue,
        mailA: mailAValue,
        trackingCname: trackingCnameValue,
        bounceCname: bounceCnameValue,
        returnPath: returnPathValue,
        autoconfigCname: autoconfigCnameValue,
        autodiscoverRecord: autodiscoverValue,
        smtpCname: smtpValue,
        imapCname: imapValue,
        pop3Cname: pop3Value,
        webmailCname: webmailValue,
        mtaSts: mtaStsValue,
        tlsRpt: tlsRptValue,
        mailFrom: returnPathHost,
      },
    };

    // Add optional IPv6 record
    if (mailIpv6) {
      result.mailAAAA = { type: 'AAAA', host: mailAAAAHost, value: mailAAAAValue, ttl, purpose: 'Mail server IPv6 address' };
      result.raw.mailAAAA = mailAAAAValue;
    }

    // Add optional CAA record
    if (env.CAA_RECORD) {
      result.caa = { type: 'CAA', host: '@', value: caaValue, ttl, purpose: 'Certificate authority authorization' };
      result.raw.caa = caaValue;
    }

    // Add optional BIMI record
    if (bimiLogoUrl) {
      result.bimi = { type: 'TXT', host: bimiHost, value: bimiValue, ttl, purpose: 'Brand logo display' };
      result.raw.bimi = bimiValue;
    }

    return result;
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
