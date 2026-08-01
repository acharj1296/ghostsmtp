import { generateKeyPairSync } from 'crypto';
import dns from 'dns';
dns.setServers([
  "1.1.1.1",
  "8.8.8.8",
]);
import { DomainRepository } from '../repositories/domain.repository';
import { DkimKeyRepository } from '../repositories/dkimKey.repository';
import { DomainVerificationRepository } from '../repositories/domainVerification.repository';


const dnsPromises = dns.promises;
console.log(dns.getServers());

export class DomainService {
  private domainRepo = new DomainRepository();
  private dkimRepo = new DkimKeyRepository();
  private verificationRepo = new DomainVerificationRepository();

  // Validate domain format using basic domain regex
  private isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    return domainRegex.test(domain);
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
      return { domain, dkim, verification };
    }

    // Generate DKIM RSA 2048 keys
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // Strip PEM headers/footers/newlines for TXT storage
    const formattedPublicKey = publicKey
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\s+/g, '');

    // Save Domain
    domain = await this.domainRepo.create({
      workspaceId: workspaceId as any,
      name: trimmedName,
      status: 'pending',
    } as any);

    // Save DKIM Keys
    const dkim = await this.dkimRepo.create({
      domainId: domain.id,
      selector: 'ghost',
      privateKey,
      publicKey: formattedPublicKey,
    } as any);

    // Generate Expected DNS parameters
    const spfRecord = 'v=spf1 include:relay.ghostsmtp.com ~all';
    const dkimRecord = `v=DKIM1; k=rsa; p=${formattedPublicKey}`;
    const dmarcRecord = `v=DMARC1; p=none; rua=mailto:dmarc-reports@ghostsmtp.com`;
    const mxRecord = '10 mail.ghostsmtp.com';
    const cnameRecord = 'tracking.ghostsmtp.com';

    // Save Verification targets
    const verification = await this.verificationRepo.create({
      domainId: domain.id,
      spfRecord,
      dkimRecord,
      dmarcRecord,
      mxRecord,
      cnameRecord,
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

  async getDomainDetails(workspaceId: string, domainId: string) {
    const domain = await this.domainRepo.findByWorkspaceAndId(workspaceId, domainId);
    if (!domain) {
      throw new Error('Domain not found.');
    }

    const dkim = await this.dkimRepo.findByDomainId(domainId);
    const verification = await this.verificationRepo.findByDomainId(domainId);

    return {
      domain,

      dnsRecords: {
        dkim: {
          host: `${dkim?.selector}._domainkey.${domain.name}`,
          value: verification?.dkimRecord,
        },

        spf: {
          host: "@",
          value: verification?.spfRecord,
        },

        dmarc: {
          host: `_dmarc.${domain.name}`,
          value: verification?.dmarcRecord,
        },

        mx: {
          host: domain.name,
          value: verification?.mxRecord,
        },

        cname: {
          host: `tracking.${domain.name}`,
          value: verification?.cnameRecord,
        },
      },

      verification,
    };
  }

  async verifyDomain(workspaceId: string, domainId: string) {
    console.log(dns.getServers());
    const domain = await this.domainRepo.findByWorkspaceAndId(workspaceId, domainId);
    if (!domain) {
      throw new Error('Domain not found.');
    }

    const dkim = await this.dkimRepo.findByDomainId(domainId);
    const verification = await this.verificationRepo.findByDomainId(domainId);

    if (!dkim || !verification) {
      throw new Error('Domain configurations missing.');
    }

    // SPF Verification
    let spfVerified = false;
    try {
      const txtRecords = await dnsPromises.resolveTxt(domain.name);
      console.log("TXT Records:", txtRecords);
      spfVerified = txtRecords.some(record => 
        record.join('').includes('v=spf1') && record.join('').includes('relay.ghostsmtp.com')
      );
      console.log("SPF TXT:", txtRecords);
      console.log("Expected SPF:", verification.spfRecord);
      console.log("SPF Verified:", spfVerified);
    } catch (e) {
      console.error("SPF ERROR:", e);
    }

    // DKIM Verification
    let dkimVerified = false;
    try {
      const dkimDomain = `${dkim.selector}._domainkey.${domain.name}`;
      const txtRecords = await dnsPromises.resolveTxt(dkimDomain);
      console.log("DKIM TXT:", txtRecords);
      dkimVerified = txtRecords.some(record => 
        record.join('').includes('v=DKIM1') && record.join('').includes(dkim.publicKey)
      );
      console.log("DKIM TXT:", txtRecords);
      console.log("Expected Public Key:", dkim.publicKey);
      console.log("DKIM Verified:", dkimVerified);
    } catch (e) {
      console.error("DKIM ERROR:", e);
    }

    // DMARC Verification
    let dmarcVerified = false;
    try {
      const dmarcDomain = `_dmarc.${domain.name}`;
      const txtRecords = await dnsPromises.resolveTxt(dmarcDomain);
      console.log("DMARC TXT:", txtRecords);
      dmarcVerified = txtRecords.some(record => 
        record.join('').includes('v=DMARC1')
      );
      console.log("DMARC TXT:", txtRecords);
      console.log("Expected DMARC:", verification.dmarcRecord);
      console.log("DMARC Verified:", dmarcVerified);
    } catch (e) {
      console.error("DMARC ERROR:", e);
    }

    // MX Verification
    let mxVerified = false;
    try {
      const mxRecords = await dnsPromises.resolveMx(domain.name);
      console.log("MX Records:", mxRecords);
      mxVerified = mxRecords.some(record => 
        record.exchange.includes('mail.ghostsmtp.com')
      );
      console.log("MX Records:", mxRecords);
      console.log("Expected MX:", verification.mxRecord);
      console.log("MX Verified:", mxVerified);
    } catch (e) {
      console.error("MX ERROR:", e);
    }

    // Update flags
    verification.spfVerified = spfVerified;
    verification.dkimVerified = dkimVerified;
    verification.dmarcVerified = dmarcVerified;
    verification.mxVerified = mxVerified;
    verification.lastVerifiedAt = new Date();
    console.log("SPF:", spfVerified);
    console.log("DKIM:", dkimVerified);
    console.log("DMARC:", dmarcVerified);
    console.log("MX:", mxVerified);
    await verification.save();

    // Check overall verification status
    // Domain is verified if SPF, DKIM, and DMARC parameters are satisfied
    const totalChecks = [
      spfVerified,
      dkimVerified,
      dmarcVerified,
      mxVerified,
    ];

    const verifiedCount = totalChecks.filter(Boolean).length;

    const oldStatus = domain.status;

    if (verifiedCount === totalChecks.length) {
      domain.status = "verified";
    } else if (verifiedCount === 0) {
      domain.status = "pending";
    } else {
      domain.status = "failed";
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
    };
  }
}
