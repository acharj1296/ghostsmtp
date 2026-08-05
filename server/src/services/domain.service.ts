import { generateKeyPairSync } from 'crypto';
import { DomainRepository } from '../repositories/domain.repository';
import { DkimKeyRepository } from '../repositories/dkimKey.repository';
import { DomainVerificationRepository } from '../repositories/domainVerification.repository';
import { env } from '../config/env';
import { DnsGeneratorService, DnsGenerationOptions, GeneratedDnsSet } from './dnsGenerator.service';
import { DnsLookupService, DnsCheckInput, DnsCheckResult } from './dnsLookup.service';
import { DnsHealthService, HealthScoreFactors } from './dnsHealth.service';
import { DnsPropagationService } from './dnsPropagation.service';
import { DeliverabilityService, DeliverabilityCheckFactors } from './deliverability.service';
import { OpenDkimService } from './opendkim.service';
import { SecurityService } from './security.service';

const dnsGenerator = new DnsGeneratorService();
const dnsLookup = new DnsLookupService();
const dnsHealth = new DnsHealthService();
const dnsPropagation = new DnsPropagationService();
const deliverability = new DeliverabilityService();
const openDkim = new OpenDkimService();

/** Domain status when every sending-critical DNS check passes. */
const REQUIRED_CHECKS = ['spf', 'dkim', 'dmarc', 'mx', 'tracking', 'returnPath'];

export class DomainService {
  private domainRepo = new DomainRepository();
  private dkimRepo = new DkimKeyRepository();
  private verificationRepo = new DomainVerificationRepository();

  // Validate domain format using basic domain regex
  private isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    return domainRegex.test(domain);
  }

  private stripPublicKey(publicKey: string): string {
    return publicKey
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\s+/g, '');
  }

  /** Encrypt the DKIM private key at rest; fall back to raw if no key configured. */
  private encryptDkimKey(privateKeyPem: string): string {
    try {
      return SecurityService.encryptSecret(privateKeyPem);
    } catch {
      return privateKeyPem;
    }
  }

  private generateKeyPair(keySize = env.DKIM_KEY_SIZE ?? 2048) {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: keySize,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return { privateKey, formattedPublicKey: this.stripPublicKey(publicKey) };
  }

  /** Effective per-domain subdomain prefixes (domain config wins, else infra env). */
  private prefixes(domain: any) {
    const bounce = domain.bounceSubdomain || env.BOUNCE_SUBDOMAIN || 'bounce';
    return {
      tracking: domain.trackingSubdomain || env.TRACKING_SUBDOMAIN || 'track',
      bounce,
      returnPath: domain.returnPathSubdomain || bounce,
      autoconfig: env.AUTOCONFIG_SUBDOMAIN || 'autoconfig',
    };
  }

  private generationOptions(domain: any, selector?: string): DnsGenerationOptions {
    const p = this.prefixes(domain);
    return {
      selector: selector ?? domain.dkimSelector ?? env.DEFAULT_DKIM_SELECTOR ?? 'ghost',
      trackingPrefix: p.tracking,
      bouncePrefix: p.bounce,
      returnPathPrefix: p.returnPath,
      autoconfigPrefix: p.autoconfig,
      dmarcPolicy: domain.dmarcPolicy || 'none',
    };
  }

  /** Persist the full generated DNS set onto a DomainVerification document. */
  private applyGeneratedSet(verification: any, domain: any, _dkim: any, set: GeneratedDnsSet): void {
    // Core records
    verification.spfRecord = set.raw.spf;
    verification.dkimRecord = set.raw.dkim;
    verification.dmarcRecord = set.raw.dmarc;
    verification.mxRecord = set.raw.mx;
    verification.cnameRecord = set.raw.trackingCname; // backward-compatible alias
    verification.trackingCname = set.raw.trackingCname;
    verification.bounceCname = set.raw.bounceCname;
    verification.returnPathRecord = set.raw.returnPath;
    verification.autoconfigCname = set.raw.autoconfigCname;
    verification.autodiscoverRecord = set.raw.autodiscoverRecord;
    verification.mailFrom = set.raw.mailFrom;
    verification.dmarcPolicy = domain.dmarcPolicy || 'none';

    // Production DNS records
    verification.mailARecord = set.raw.mailA;
    if (set.raw.mailAAAA) {
      verification.mailAAAARecord = set.raw.mailAAAA;
    }
    verification.smtpCname = set.raw.smtpCname;
    verification.imapCname = set.raw.imapCname;
    verification.pop3Cname = set.raw.pop3Cname;
    verification.webmailCname = set.raw.webmailCname;
    verification.mtaStsRecord = set.raw.mtaSts;
    verification.tlsRptRecord = set.raw.tlsRpt;
    if (set.raw.caa) {
      verification.caaRecord = set.raw.caa;
    }
    if (set.raw.bimi) {
      verification.bimiRecord = set.raw.bimi;
    }
  }

  /**
   * Upgrade a legacy domain (created before real DNS generation) to the full
   * production record set, and sync its key to OpenDKIM. No-op for current
   * domains. Ensures previously-created domains also get real records.
   */
  private async ensureProductionRecords(domain: any, dkim: any, verification: any): Promise<void> {
    if (!dkim || !verification) return;
    if (!verification.mailFrom) {
      const set = dnsGenerator.generateForDomain(
        domain.name,
        dkim.publicKey,
        this.generationOptions(domain, dkim.selector)
      );
      this.applyGeneratedSet(verification, domain, dkim, set);
      await verification.save();
    }
    // Best-effort: make sure the key exists in the OpenDKIM container.
    const privateKey = this.tryDecryptDkimKey(dkim.privateKey);
    if (privateKey) {
      await openDkim.syncDomain(domain.name, dkim.selector, privateKey);
    }
  }

  private tryDecryptDkimKey(stored: string): string | null {
    if (!stored) return null;
    if (stored.includes('-----BEGIN')) return stored; // already plaintext
    try {
      return SecurityService.decryptSecret(stored);
    } catch {
      return null;
    }
  }

  async createDomain(workspaceId: string, name: string) {
    const trimmedName = name.toLowerCase().trim();

    if (!this.isValidDomain(trimmedName)) {
      throw new Error('Invalid domain format.');
    }

    // Check if domain is already verified in ANY workspace globally
    const globallyVerified = await this.domainRepo.findVerifiedGlobally(trimmedName);
    if (globallyVerified) {
      throw new Error('This domain is already verified in another workspace.');
    }

    // Check if domain already exists in this workspace
    let domain = await this.domainRepo.findByName(workspaceId, trimmedName);

    if (domain) {
      // If it exists in the workspace, fetch details and return
      const dkim = await this.dkimRepo.findByDomainId(domain.id);
      const verification = await this.verificationRepo.findByDomainId(domain.id);
      await this.ensureProductionRecords(domain, dkim, verification);
      return { domain, dkim, verification };
    }

    // Generate DKIM RSA keypair (real key, shared with OpenDKIM later)
    const { privateKey, formattedPublicKey } = this.generateKeyPair();

    // Save Domain with auto-populated mail server configuration
    domain = await this.domainRepo.create({
      workspaceId: workspaceId as any,
      name: trimmedName,
      status: 'pending',
      mailServerHost: env.MAIL_SERVER_HOST,
      mailServerIp: env.MAIL_SERVER_IP || env.MAIL_SERVER_HOST, // Fallback to hostname if IP not set
      dmarcPolicy: 'none',
    } as any);

    // Save DKIM Keys (private key encrypted at rest, public key stripped for DNS)
    const dkim = await this.dkimRepo.create({
      domainId: domain.id,
      selector: env.DEFAULT_DKIM_SELECTOR || 'ghost',
      privateKey: this.encryptDkimKey(privateKey),
      publicKey: formattedPublicKey,
      keySize: env.DKIM_KEY_SIZE ?? 2048,
      isActive: true,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    } as any);

    // Sync the REAL private key into the OpenDKIM container (best-effort).
    await openDkim.syncDomain(domain.name, dkim.selector, privateKey);

    // Generate real DNS records from the actual mail infrastructure.
    const set = dnsGenerator.generateForDomain(
      domain.name,
      formattedPublicKey,
      this.generationOptions(domain, dkim.selector)
    );

    // Save Verification targets (expected values the customer must publish)
    const verification = await this.verificationRepo.create({
      domainId: domain.id,
      spfRecord: set.raw.spf,
      dkimRecord: set.raw.dkim,
      dmarcRecord: set.raw.dmarc,
      mxRecord: set.raw.mx,
      cnameRecord: set.raw.trackingCname,
      trackingCname: set.raw.trackingCname,
      bounceCname: set.raw.bounceCname,
      returnPathRecord: set.raw.returnPath,
      autoconfigCname: set.raw.autoconfigCname,
      autodiscoverRecord: set.raw.autodiscoverRecord,
      mailFrom: set.raw.mailFrom,
      dmarcPolicy: 'none',
      spfVerified: false,
      dkimVerified: false,
      dmarcVerified: false,
      mxVerified: false,
      cnameVerified: false,
    } as any);

    return { domain, dkim, verification };
  }

  async deleteDomain(workspaceId: string, domainId: string) {
    const domain = await this.domainRepo.findByWorkspaceAndId(workspaceId, domainId);
    if (!domain) {
      throw new Error('Domain not found.');
    }

    // Perform soft delete
    await this.domainRepo.delete(domainId);
    return { success: true };
  }

  async listDomains(workspaceId: string) {
    return this.domainRepo.findByWorkspace(workspaceId);
  }

  private buildDnsRecords(domain: any, dkim: any, verification: any) {
    const p = this.prefixes(domain);
    const selector = dkim?.selector || domain.dkimSelector || env.DEFAULT_DKIM_SELECTOR || 'ghost';

    return {
      spf: { type: 'TXT', host: '@', value: verification?.spfRecord },
      dkim: { type: 'TXT', host: `${selector}._domainkey.${domain.name}`, value: verification?.dkimRecord },
      dmarc: { type: 'TXT', host: `_dmarc.${domain.name}`, value: verification?.dmarcRecord },
      mx: { type: 'MX', host: domain.name, value: verification?.mxRecord },
      cname: { type: 'CNAME', host: `${p.tracking}.${domain.name}`, value: verification?.cnameRecord }, // backward-compatible alias
      tracking: { type: 'CNAME', host: `${p.tracking}.${domain.name}`, value: verification?.trackingCname },
      bounce: { type: 'CNAME', host: `${p.bounce}.${domain.name}`, value: verification?.bounceCname },
      returnPath: { type: 'CNAME', host: `${p.returnPath}.${domain.name}`, value: verification?.returnPathRecord },
      autoconfig: { type: 'CNAME', host: `${p.autoconfig}.${domain.name}`, value: verification?.autoconfigCname },
      autodiscover: { type: 'SRV', host: `_autodiscover._tcp.${domain.name}`, value: verification?.autodiscoverRecord },
      mailFrom: { type: 'TXT', host: `${p.returnPath}.${domain.name}`, value: verification?.mailFrom },
    };
  }

  async getDomainDetails(workspaceId: string, domainId: string) {
    const domain = await this.domainRepo.findByWorkspaceAndId(workspaceId, domainId);
    if (!domain) {
      throw new Error('Domain not found.');
    }

    const dkim = await this.dkimRepo.findByDomainId(domainId);
    const verification = await this.verificationRepo.findByDomainId(domainId);
    await this.ensureProductionRecords(domain, dkim, verification);

    return {
      domain,
      dnsRecords: this.buildDnsRecords(domain, dkim, verification),
      verification,
    };
  }

  private buildVerificationChecks(domain: any, dkim: any, verification: any): DnsCheckInput[] {
    const p = this.prefixes(domain);
    const selector = dkim?.selector || domain.dkimSelector || env.DEFAULT_DKIM_SELECTOR || 'ghost';

    const checks: DnsCheckInput[] = [
      { record: 'spf', label: 'SPF', type: 'TXT', host: domain.name, expected: verification.spfRecord },
      { record: 'dkim', label: 'DKIM', type: 'TXT', host: `${selector}._domainkey.${domain.name}`, expected: verification.dkimRecord },
      { record: 'dmarc', label: 'DMARC', type: 'TXT', host: `_dmarc.${domain.name}`, expected: verification.dmarcRecord },
      { record: 'mx', label: 'MX', type: 'MX', host: domain.name, expected: verification.mxRecord },
      { record: 'tracking', label: 'Tracking CNAME', type: 'CNAME', host: `${p.tracking}.${domain.name}`, expected: verification.trackingCname },
      { record: 'bounce', label: 'Bounce CNAME', type: 'CNAME', host: `${p.bounce}.${domain.name}`, expected: verification.bounceCname },
      { record: 'returnPath', label: 'Return-Path CNAME', type: 'CNAME', host: `${p.returnPath}.${domain.name}`, expected: verification.returnPathRecord },
      { record: 'autoconfig', label: 'Autoconfig CNAME', type: 'CNAME', host: `${p.autoconfig}.${domain.name}`, expected: verification.autoconfigCname },
      { record: 'autodiscover', label: 'Autodiscover SRV', type: 'SRV', host: `_autodiscover._tcp.${domain.name}`, expected: verification.autodiscoverRecord },
    ];

    // Reverse DNS (PTR): reverse-lookup the mail server IP; expect it to resolve
    // to the mail server hostname. Informational — not part of REQUIRED_CHECKS.
    if (domain.mailServerIp) {
      checks.push({
        record: 'ptr',
        label: 'PTR / Reverse DNS',
        type: 'PTR',
        host: domain.mailServerIp,
        expected: env.MAIL_SERVER_HOST || domain.mailServerHost,
      });
    }

    return checks;
  }

  async verifyDomain(workspaceId: string, domainId: string) {
    const domain = await this.domainRepo.findByWorkspaceAndId(workspaceId, domainId);
    if (!domain) {
      throw new Error('Domain not found.');
    }

    const dkim = await this.dkimRepo.findByDomainId(domainId);
    const verification = await this.verificationRepo.findByDomainId(domainId);

    if (!dkim || !verification) {
      throw new Error('Domain configurations missing.');
    }

    await this.ensureProductionRecords(domain, dkim, verification);

    // Run all live DNS checks concurrently.
    const checks = this.buildVerificationChecks(domain, dkim, verification);
    const results = await dnsLookup.verifyAll(checks);

    const byRecord = new Map(results.map((r) => [r.record, r]));

    // Update per-record verified flags (including backward-compatible aliases).
    verification.spfVerified = !!byRecord.get('spf')?.verified;
    verification.dkimVerified = !!byRecord.get('dkim')?.verified;
    verification.dmarcVerified = !!byRecord.get('dmarc')?.verified;
    verification.mxVerified = !!byRecord.get('mx')?.verified;
    verification.cnameVerified = !!byRecord.get('tracking')?.verified;
    verification.trackingVerified = !!byRecord.get('tracking')?.verified;
    verification.bounceVerified = !!byRecord.get('bounce')?.verified;
    verification.returnPathVerified = !!byRecord.get('returnPath')?.verified;
    verification.autoconfigVerified = !!byRecord.get('autoconfig')?.verified;
    verification.autodiscoverVerified = !!byRecord.get('autodiscover')?.verified;
    verification.lastVerifiedAt = new Date();

    // Store detailed per-check output + human-readable errors.
    verification.verificationResults = results.map((r) => ({
      record: r.record,
      label: r.label,
      type: r.type,
      host: r.host,
      expected: r.expected,
      actual: r.actual,
      allActual: r.allActual,
      verified: r.verified,
      error: r.error,
    }));
    // PTR is informational (not part of REQUIRED_CHECKS): persist the matched
    // hostname for the health/deliverability analyzers but don't surface it as a
    // domain error.
    const ptrResult = byRecord.get('ptr');
    verification.ptrRecord = ptrResult?.actual || '';
    verification.verificationErrors = results
      .filter((r) => !r.verified && r.record !== 'ptr')
      .map((r) => `${r.label} (${r.host}): ${r.error || 'record not found'}`);

    // Detect DNSSEC signing (RRSIG present on the apex). Informational.
    const dnssec = await dnsLookup.checkDnssec(domain.name);
    verification.dnssecEnabled = dnssec.enabled;

    await verification.save();

    // Determine overall status from the sending-critical checks.
    const totalChecks = REQUIRED_CHECKS;
    const verifiedCount = totalChecks.filter((key) => !!byRecord.get(key)?.verified).length;

    const oldStatus = domain.status;
    if (verifiedCount === totalChecks.length) {
      domain.status = 'verified';
    } else if (verifiedCount === 0) {
      domain.status = 'pending';
    } else {
      domain.status = 'failed';
    }

    await domain.save();

    // Audit or log change if status transitioned
    if (oldStatus !== domain.status) {
      console.log(`[Domain Service] Domain ${domain.name} status updated to: ${domain.status}`);
    }

    return {
      status: domain.status,
      domain,
      verification,
      results,
    };
  }

  /**
   * Rotate the DKIM keypair for a domain. Generates a fresh key, syncs it to
   * OpenDKIM, and regenerates the DKIM DNS record so the customer can publish
   * the new public key. Non-breaking addition.
   */
  async regenerateDkim(workspaceId: string, domainId: string) {
    const domain = await this.domainRepo.findByWorkspaceAndId(workspaceId, domainId);
    if (!domain) {
      throw new Error('Domain not found.');
    }

    let dkim = await this.dkimRepo.findByDomainId(domainId);
    const verification = await this.verificationRepo.findByDomainId(domainId);
    if (!verification) {
      throw new Error('Domain configurations missing.');
    }

    const { privateKey, formattedPublicKey } = this.generateKeyPair();
    const selector = dkim?.selector || env.DEFAULT_DKIM_SELECTOR || 'ghost';

    if (dkim) {
      dkim.privateKey = this.encryptDkimKey(privateKey);
      dkim.publicKey = formattedPublicKey;
      dkim.keySize = env.DKIM_KEY_SIZE ?? 2048;
      dkim.generatedAt = new Date();
      dkim.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      await dkim.save();
    } else {
      dkim = await this.dkimRepo.create({
        domainId: domain.id,
        selector,
        privateKey: this.encryptDkimKey(privateKey),
        publicKey: formattedPublicKey,
        keySize: env.DKIM_KEY_SIZE ?? 2048,
        isActive: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      } as any);
    }

    // Sync the new key + refresh DKIM record.
    await openDkim.syncDomain(domain.name, selector, privateKey);
    const set = dnsGenerator.generateForDomain(
      domain.name,
      formattedPublicKey,
      this.generationOptions(domain, selector)
    );
    verification.dkimRecord = set.raw.dkim;
    verification.dkimVerified = false;
    await verification.save();

    return { domain, dkim, verification };
  }

  /**
   * Calculate DNS health score for a domain based on verification results
   */
  async calculateHealthScore(workspaceId: string, domainId: string) {
    const domain = await this.domainRepo.findByWorkspaceAndId(workspaceId, domainId);
    if (!domain) {
      throw new Error('Domain not found.');
    }

    const verification = await this.verificationRepo.findByDomainId(domainId);
    if (!verification) {
      throw new Error('Domain verification data not found.');
    }

    // Build health factors from verification status
    const factors: HealthScoreFactors = {
      spfPresent: verification.spfVerified,
      dkimValid: verification.dkimVerified,
      dmarcConfigured: verification.dmarcVerified,
      mxValid: verification.mxVerified,
      ptrPresent: !!verification.ptrRecord,
      tlsCapable: true, // Assumed from infrastructure
      mtaStsConfigured: verification.mtaStsVerified,
      bimiConfigured: !!verification.bimiRecord,
      dnssecEnabled: verification.dnssecEnabled || false,
    };

    const report = dnsHealth.calculateScore(
      (verification.verificationResults as unknown as DnsCheckResult[]),
      domain.mailServerIp,
      factors
    );

    // Store score in database
    verification.healthScore = report.score;
    verification.lastHealthScoreAt = new Date();
    await verification.save();

    return report;
  }

  /**
   * Check DNS propagation across multiple public resolvers
   */
  async checkPropagation(workspaceId: string, domainId: string) {
    const domain = await this.domainRepo.findByWorkspaceAndId(workspaceId, domainId);
    if (!domain) {
      throw new Error('Domain not found.');
    }

    const verification = await this.verificationRepo.findByDomainId(domainId);
    if (!verification) {
      throw new Error('Domain verification data not found.');
    }

    const dkim = await this.dkimRepo.findByDomainId(domainId);
    if (!dkim) {
      throw new Error('DKIM key not found.');
    }

    const p = this.prefixes(domain);
    const selector = dkim?.selector || domain.dkimSelector || env.DEFAULT_DKIM_SELECTOR || 'ghost';

    // Build propagation checks for all record types
    const checks: DnsCheckInput[] = [
      { record: 'spf', label: 'SPF', type: 'TXT', host: domain.name, expected: verification.spfRecord },
      { record: 'dkim', label: 'DKIM', type: 'TXT', host: `${selector}._domainkey.${domain.name}`, expected: verification.dkimRecord },
      { record: 'dmarc', label: 'DMARC', type: 'TXT', host: `_dmarc.${domain.name}`, expected: verification.dmarcRecord },
      { record: 'mx', label: 'MX', type: 'MX', host: domain.name, expected: verification.mxRecord },
      { record: 'mailA', label: 'Mail A', type: 'A', host: `mail.${domain.name}`, expected: verification.mailARecord },
      { record: 'tracking', label: 'Tracking CNAME', type: 'CNAME', host: `${p.tracking}.${domain.name}`, expected: verification.trackingCname },
      { record: 'bounce', label: 'Bounce CNAME', type: 'CNAME', host: `${p.bounce}.${domain.name}`, expected: verification.bounceCname },
      { record: 'mtaSts', label: 'MTA-STS', type: 'TXT', host: `_mta-sts.${domain.name}`, expected: verification.mtaStsRecord },
    ];

    if (verification.mailAAAARecord) {
      checks.push({
        record: 'mailAAAA',
        label: 'Mail AAAA',
        type: 'AAAA',
        host: `mail.${domain.name}`,
        expected: verification.mailAAAARecord,
      });
    }

    const propagationStatus = await dnsPropagation.checkAllPropagation(checks);

    return {
      domain: domain.name,
      timestamp: new Date(),
      records: propagationStatus,
      overallPropagationPercentage: Math.round(
        propagationStatus.reduce((sum, r) => sum + r.propagationPercentage, 0) / propagationStatus.length
      ),
    };
  }

  /**
   * Analyze email deliverability for a domain
   */
  async analyzeDeliverability(workspaceId: string, domainId: string) {
    const domain = await this.domainRepo.findByWorkspaceAndId(workspaceId, domainId);
    if (!domain) {
      throw new Error('Domain not found.');
    }

    const verification = await this.verificationRepo.findByDomainId(domainId);
    if (!verification) {
      throw new Error('Domain verification data not found.');
    }

    // Build deliverability factors from verification status
    const factors: DeliverabilityCheckFactors = {
      spfConfigured: !!verification.spfRecord,
      spfValid: verification.spfVerified,
      dkimConfigured: !!verification.dkimRecord,
      dkimValid: verification.dkimVerified,
      dmarcConfigured: !!verification.dmarcRecord,
      dmarcValid: verification.dmarcVerified,
      reversedns: !!verification.ptrRecord,
      tlsCapable: true, // Assumed from infrastructure
      openRelay: false, // Assumed secure by default
      spamScore: 0, // No spam indicators detected
    };

    const report = await deliverability.analyzeDeliverability(
      domain.name,
      domain.mailServerIp,
      (verification.verificationResults as unknown as DnsCheckResult[]),
      factors
    );

    // Store deliverability status in database
    verification.deliverabilityStatus = report.status;
    verification.lastDeliverabilityCheckAt = new Date();
    await verification.save();

    return report;
  }

  /**
   * Get comprehensive DNS information for a domain (health, propagation, deliverability)
   */
  async getDnsComprehensive(workspaceId: string, domainId: string) {
    const domain = await this.domainRepo.findByWorkspaceAndId(workspaceId, domainId);
    if (!domain) {
      throw new Error('Domain not found.');
    }

    const dkim = await this.dkimRepo.findByDomainId(domainId);
    const verification = await this.verificationRepo.findByDomainId(domainId);
    await this.ensureProductionRecords(domain, dkim, verification);

    // Fetch all metrics in parallel
    const [healthReport, propagationReport, deliverabilityReport] = await Promise.all([
      this.calculateHealthScore(workspaceId, domainId),
      this.checkPropagation(workspaceId, domainId),
      this.analyzeDeliverability(workspaceId, domainId),
    ]);

    return {
      domain: {
        name: domain.name,
        status: domain.status,
        mailServerHost: domain.mailServerHost,
        mailServerIp: domain.mailServerIp,
      },
      dnsRecords: this.buildDnsRecords(domain, dkim, verification),
      verification,
      health: healthReport,
      propagation: propagationReport,
      deliverability: deliverabilityReport,
    };
  }
}