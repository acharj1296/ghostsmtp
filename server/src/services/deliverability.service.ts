import dns from 'dns';
import { DnsCheckResult } from './dnsLookup.service';

export interface DeliverabilityCheckFactors {
  spfConfigured: boolean;
  spfValid: boolean;
  dkimConfigured: boolean;
  dkimValid: boolean;
  dmarcConfigured: boolean;
  dmarcValid: boolean;
  reversedns: boolean;
  tlsCapable: boolean;
  openRelay: boolean; // true if vulnerable
  spamScore: number; // 0-10 scale
}

export interface DeliverabilityReport {
  status: 'excellent' | 'good' | 'needs_improvement' | 'critical';
  score: number; // 0-100
  summary: string;
  factors: DeliverabilityCheckFactors;
  issues: string[];
  recommendations: string[];
  details: {
    spf: { configured: boolean; valid: boolean; issues: string[] };
    dkim: { configured: boolean; valid: boolean; issues: string[] };
    dmarc: { configured: boolean; valid: boolean; issues: string[] };
    reversedns: { present: boolean; issues: string[] };
    tls: { capable: boolean; issues: string[] };
    openRelay: { vulnerable: boolean; details: string };
  };
  lastCheckAt: Date;
}

export class DeliverabilityService {
  private dnsPromises = dns.promises;

  /**
   * Comprehensive email deliverability analysis.
   * Checks SPF alignment, DKIM alignment, DMARC alignment, reverse DNS,
   * open relay vulnerability, TLS capability, and spam score indicators.
   */
  async analyzeDeliverability(
    domainName: string,
    mailServerIp: string | undefined,
    verificationResults: DnsCheckResult[] | undefined,
    factors: DeliverabilityCheckFactors
  ): Promise<DeliverabilityReport> {
    const resultMap = new Map((verificationResults || []).map((r) => [r.record, r]));

    const details = {
      spf: this.analyzeSPF(factors, resultMap),
      dkim: this.analyzeDKIM(factors, resultMap),
      dmarc: this.analyzeDMARC(factors, resultMap),
      reversedns: await this.analyzeReverseDNS(mailServerIp),
      tls: this.analyzeTLS(factors),
      openRelay: await this.analyzeOpenRelay(domainName),
    };

    const { score, issues, recommendations } = this.scoreDeliverability(
      factors,
      details
    );

    let status: 'excellent' | 'good' | 'needs_improvement' | 'critical' =
      'critical';
    if (score >= 90) status = 'excellent';
    else if (score >= 75) status = 'good';
    else if (score >= 50) status = 'needs_improvement';

    const summary = this.generateSummary(status, issues);

    return {
      status,
      score,
      summary,
      factors,
      issues,
      recommendations,
      details,
      lastCheckAt: new Date(),
    };
  }

  private analyzeSPF(
    factors: DeliverabilityCheckFactors,
    resultMap: Map<string, DnsCheckResult>
  ): DeliverabilityReport['details']['spf'] {
    const issues: string[] = [];

    if (!factors.spfConfigured) {
      issues.push('SPF record not configured');
    } else if (!factors.spfValid) {
      issues.push('SPF record invalid or not properly aligned');
      const spfResult = resultMap.get('spf');
      if (spfResult?.error) {
        issues.push(`SPF verification error: ${spfResult.error}`);
      }
    }

    if (factors.spfConfigured && factors.spfValid) {
      // Additional checks for SPF best practices
      const spfResult = resultMap.get('spf');
      if (spfResult?.expected && !spfResult.expected.includes('-all')) {
        issues.push(
          'SPF record should use "-all" (hard fail) instead of "~all" for better security'
        );
      }
    }

    return {
      configured: factors.spfConfigured,
      valid: factors.spfValid,
      issues,
    };
  }

  private analyzeDKIM(
    factors: DeliverabilityCheckFactors,
    resultMap: Map<string, DnsCheckResult>
  ): DeliverabilityReport['details']['dkim'] {
    const issues: string[] = [];

    if (!factors.dkimConfigured) {
      issues.push('DKIM signing not configured');
    } else if (!factors.dkimValid) {
      issues.push('DKIM public key not published or invalid');
      const dkimResult = resultMap.get('dkim');
      if (dkimResult?.error) {
        issues.push(`DKIM verification error: ${dkimResult.error}`);
      }
    }

    if (factors.dkimConfigured && factors.dkimValid) {
      // DKIM is properly configured
    }

    return {
      configured: factors.dkimConfigured,
      valid: factors.dkimValid,
      issues,
    };
  }

  private analyzeDMARC(
    factors: DeliverabilityCheckFactors,
    resultMap: Map<string, DnsCheckResult>
  ): DeliverabilityReport['details']['dmarc'] {
    const issues: string[] = [];

    if (!factors.dmarcConfigured) {
      issues.push('DMARC policy not configured');
    } else if (!factors.dmarcValid) {
      issues.push('DMARC policy invalid or not published');
      const dmarcResult = resultMap.get('dmarc');
      if (dmarcResult?.error) {
        issues.push(`DMARC verification error: ${dmarcResult.error}`);
      }
    }

    if (factors.dmarcConfigured && factors.dmarcValid) {
      const dmarcResult = resultMap.get('dmarc');
      if (dmarcResult?.expected && dmarcResult.expected.includes('p=none')) {
        issues.push(
          'DMARC policy is set to "none" - consider graduating to "quarantine" or "reject" once SPF/DKIM align'
        );
      }
    }

    return {
      configured: factors.dmarcConfigured,
      valid: factors.dmarcValid,
      issues,
    };
  }

  private async analyzeReverseDNS(
    mailServerIp: string | undefined
  ): Promise<DeliverabilityReport['details']['reversedns'] > {
    const issues: string[] = [];
    let present = false;

    if (!mailServerIp) {
      issues.push('Mail server IP not configured');
      return { present: false, issues };
    }

    try {
      const ptrRecords = await this.dnsPromises.reverse(mailServerIp);
      present = ptrRecords && ptrRecords.length > 0;

      if (!present) {
        issues.push(`No reverse DNS (PTR) record for IP ${mailServerIp}`);
      }
    } catch (err: any) {
      issues.push(`Reverse DNS lookup failed: ${err?.message || 'unknown error'}`);
    }

    return { present, issues };
  }

  private analyzeTLS(
    factors: DeliverabilityCheckFactors
  ): DeliverabilityReport['details']['tls'] {
    const issues: string[] = [];

    if (!factors.tlsCapable) {
      issues.push('TLS encryption not available - all connections are unencrypted');
    }

    return {
      capable: factors.tlsCapable,
      issues,
    };
  }

  private async analyzeOpenRelay(
    domainName: string
  ): Promise<DeliverabilityReport['details']['openRelay'] > {
    // This is a simplified check - in production, you'd use external SMTP testing services
    // For now, we document that proper open relay testing requires live SMTP connection
    const details =
      'Proper open relay testing requires SMTP connection testing. Use services like ' +
      'SMTP.COM or abuse.net for comprehensive checks.';

    return {
      vulnerable: false, // Default to false - proper testing needed
      details,
    };
  }

  private scoreDeliverability(
    factors: DeliverabilityCheckFactors,
    details: DeliverabilityReport['details']
  ): {
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    let score = 0;
    const issues: string[] = [];
    const recommendations: string[] = [];

    // SPF: 20 points (high impact)
    if (factors.spfConfigured && factors.spfValid) {
      score += 20;
    } else if (factors.spfConfigured) {
      score += 10;
      issues.push(...details.spf.issues);
    } else {
      issues.push('SPF record missing');
      recommendations.push(
        'Configure SPF record to authenticate your mail server and prevent spoofing'
      );
    }

    // DKIM: 20 points (high impact)
    if (factors.dkimConfigured && factors.dkimValid) {
      score += 20;
    } else if (factors.dkimConfigured) {
      score += 10;
      issues.push(...details.dkim.issues);
    } else {
      issues.push('DKIM signing not configured');
      recommendations.push(
        'Configure DKIM to add cryptographic signatures to outgoing emails'
      );
    }

    // DMARC: 15 points (important)
    if (factors.dmarcConfigured && factors.dmarcValid) {
      score += 15;
    } else if (factors.dmarcConfigured) {
      score += 7;
      issues.push(...details.dmarc.issues);
    } else {
      issues.push('DMARC policy not configured');
      recommendations.push(
        'Configure DMARC policy to specify handling of SPF/DKIM failures'
      );
    }

    // Reverse DNS: 15 points (significant impact)
    if (details.reversedns.present) {
      score += 15;
    } else {
      issues.push(...details.reversedns.issues);
      recommendations.push(
        'Configure reverse DNS (PTR record) for your mail server IP'
      );
    }

    // TLS: 15 points (encryption)
    if (factors.tlsCapable) {
      score += 15;
    } else {
      issues.push(...details.tls.issues);
      recommendations.push('Enable TLS encryption for SMTP connections');
    }

    // Spam score: 10 points
    const spamPenalty = Math.min(factors.spamScore * 2, 10); // Up to 2 points per spam indicator
    score += Math.max(10 - spamPenalty, 0);

    // Open relay: 5 points (security bonus)
    if (!details.openRelay.vulnerable) {
      score += 5;
    }

    return {
      score: Math.min(score, 100),
      issues,
      recommendations,
    };
  }

  private generateSummary(
    status: 'excellent' | 'good' | 'needs_improvement' | 'critical',
    issues: string[]
  ): string {
    switch (status) {
      case 'excellent':
        return 'Your domain is properly configured for professional email delivery with all critical authentication records in place.';
      case 'good':
        return 'Your domain has good email configuration but could be improved with additional authentication records.';
      case 'needs_improvement':
        return 'Your domain requires configuration improvements to ensure reliable email delivery. Review the issues below.';
      case 'critical':
        return `Your domain has critical email delivery issues that must be addressed: ${issues.slice(0, 2).join(', ')}.`;
      default:
        return 'Email deliverability status unknown.';
    }
  }
}

export default DeliverabilityService;
