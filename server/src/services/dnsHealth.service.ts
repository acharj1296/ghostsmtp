import { DnsCheckResult } from './dnsLookup.service';

export interface HealthScoreFactors {
  spfPresent: boolean;
  dkimValid: boolean;
  dmarcConfigured: boolean;
  mxValid: boolean;
  ptrPresent: boolean;
  tlsCapable: boolean;
  mtaStsConfigured: boolean;
  bimiConfigured: boolean;
  dnssecEnabled: boolean;
}

export interface HealthScoreReport {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: HealthScoreFactors;
  breakdown: {
    spf: number;
    dkim: number;
    dmarc: number;
    mx: number;
    ptr: number;
    tls: number;
    mtaSts: number;
    bimi: number;
    dnssec: number;
  };
  recommendations: string[];
}

export class DnsHealthService {
  /**
   * Calculate DNS health score (0-100) based on verification results and infrastructure config.
   * Scoring:
   * - SPF (15%): Critical for sending reputation
   * - DKIM (15%): Email signature verification
   * - DMARC (15%): Policy enforcement
   * - MX (15%): Mail server routing
   * - PTR (10%): Reverse DNS (high sender reputation impact)
   * - TLS (10%): Encryption capability
   * - MTA-STS (10%): TLS enforcement policy
   * - BIMI (5%): Brand indicators (nice-to-have)
   * - DNSSEC (5%): DNSSEC signing
   */
  calculateScore(
    verificationResults: DnsCheckResult[] | undefined,
    mailServerIp: string | undefined,
    factors: HealthScoreFactors
  ): HealthScoreReport {
    const breakdown = {
      spf: 0,
      dkim: 0,
      dmarc: 0,
      mx: 0,
      ptr: 0,
      tls: 0,
      mtaSts: 0,
      bimi: 0,
      dnssec: 0,
    };

    // Build result map for quick lookup
    const resultMap = new Map(
      (verificationResults || []).map((r) => [r.record, r])
    );

    // SPF: 15 points
    if (factors.spfPresent) {
      const spfResult = resultMap.get('spf');
      breakdown.spf = spfResult?.verified ? 15 : 7;
    }

    // DKIM: 15 points
    if (factors.dkimValid) {
      const dkimResult = resultMap.get('dkim');
      breakdown.dkim = dkimResult?.verified ? 15 : 7;
    }

    // DMARC: 15 points
    if (factors.dmarcConfigured) {
      const dmarcResult = resultMap.get('dmarc');
      breakdown.dmarc = dmarcResult?.verified ? 15 : 7;
    }

    // MX: 15 points
    if (factors.mxValid) {
      const mxResult = resultMap.get('mx');
      breakdown.mx = mxResult?.verified ? 15 : 7;
    }

    // PTR (Reverse DNS): 10 points (high impact on deliverability)
    breakdown.ptr = factors.ptrPresent ? 10 : 0;

    // TLS: 10 points (capability check)
    breakdown.tls = factors.tlsCapable ? 10 : 0;

    // MTA-STS: 10 points (TLS enforcement)
    if (factors.mtaStsConfigured) {
      const mtaStsResult = resultMap.get('mtaSts');
      breakdown.mtaSts = mtaStsResult?.verified ? 10 : 5;
    }

    // BIMI: 5 points (nice-to-have for brand recognition)
    breakdown.bimi = factors.bimiConfigured ? 5 : 0;

    // DNSSEC: 5 points (additional security layer)
    breakdown.dnssec = factors.dnssecEnabled ? 5 : 0;

    const score = Object.values(breakdown).reduce((a, b) => a + b, 0);

    // Determine grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';

    // Generate recommendations
    const recommendations = this.generateRecommendations(factors, resultMap);

    return {
      score,
      grade,
      factors,
      breakdown,
      recommendations,
    };
  }

  private generateRecommendations(
    factors: HealthScoreFactors,
    resultMap: Map<string, DnsCheckResult>
  ): string[] {
    const recs: string[] = [];

    if (!factors.spfPresent || !resultMap.get('spf')?.verified) {
      recs.push(
        'Add or verify your SPF record to improve email authentication and deliverability.'
      );
    }

    if (!factors.dkimValid || !resultMap.get('dkim')?.verified) {
      recs.push(
        'Configure DKIM signing to add cryptographic signatures to outgoing emails.'
      );
    }

    if (!factors.dmarcConfigured || !resultMap.get('dmarc')?.verified) {
      recs.push(
        'Enable DMARC to specify how to handle authentication failures. Start with p=none.'
      );
    }

    if (!factors.ptrPresent) {
      recs.push(
        'Configure reverse DNS (PTR record) for your mail server IP to improve reputation.'
      );
    }

    if (!factors.tlsCapable) {
      recs.push(
        'Enable TLS encryption for all mail connections to protect message content.'
      );
    }

    if (!factors.mtaStsConfigured || !resultMap.get('mtaSts')?.verified) {
      recs.push(
        'Publish MTA-STS policy to enforce TLS for incoming connections from other mail servers.'
      );
    }

    if (!factors.bimiConfigured) {
      recs.push(
        'Add your company logo via BIMI for improved brand recognition in supported email clients.'
      );
    }

    if (!factors.dnssecEnabled) {
      recs.push(
        'Consider enabling DNSSEC signing on your domain for additional DNS security.'
      );
    }

    return recs;
  }
}

export default DnsHealthService;
