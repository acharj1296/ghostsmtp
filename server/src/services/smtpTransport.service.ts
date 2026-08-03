import nodemailer, { Transporter } from 'nodemailer';
import { ISmtpCredential } from '../models/smtpCredential.model';
import { SecurityService } from './security.service';
import { env } from '../config/env';

export type SmtpCredentialType = 'external' | 'local_relay';

export interface ResolvedSmtpConfig {
  type: SmtpCredentialType;
  host: string;
  port: number;
  secure: boolean;
  auth?: { user: string; pass: string };
  credentialId?: string;
  debugInfo: Record<string, unknown>;
}

export class SmtpTransportService {
  static resolveLocalRelayConfig(): ResolvedSmtpConfig {
    const host = process.env.SMTP_HOST || 'localhost';
    const port = parseInt(process.env.SMTP_PORT || '25', 10);

    return {
      type: 'local_relay',
      host,
      port,
      secure: false,
      debugInfo: {
        relay: 'local_postfix',
        host,
        port,
      },
    };
  }

  static resolveCredentialConfig(cred: ISmtpCredential): ResolvedSmtpConfig {
    if (cred.host && cred.smtpUsername && cred.encryptedPassword) {
      const password = SecurityService.decryptSecret(cred.encryptedPassword);

      return {
        type: 'external',
        host: cred.host,
        port: cred.port || 587,
        secure: !!cred.secure,
        auth: {
          user: cred.smtpUsername,
          pass: password,
        },
        credentialId: cred.id,
        debugInfo: {
          type: 'external',
          host: cred.host,
          port: cred.port || 587,
          secure: !!cred.secure,
          username: cred.smtpUsername,
          authenticationType: cred.authenticationType || 'plain',
        },
      };
    }

    if (cred.username) {
      const local = this.resolveLocalRelayConfig();
      return {
        ...local,
        credentialId: cred.id,
        debugInfo: {
          ...local.debugInfo,
          type: 'local_relay',
          credentialUsername: cred.username,
        },
      };
    }

    throw new Error(
      'Incomplete SMTP credential configuration. Provide host/smtpUsername/password for external SMTP, or use a local relay credential.'
    );
  }

  static createTransporter(config: ResolvedSmtpConfig): Transporter {
    const enableDebug =
      env.NODE_ENV === 'development' || process.env.SMTP_DEBUG === 'true';

    console.log('[SMTP] Creating transporter:', {
      type: config.type,
      host: config.host,
      port: config.port,
      secure: config.secure,
      hasAuth: !!config.auth,
      username: config.auth?.user,
    });

    const isLocalRelay = config.type === 'local_relay';

    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      // Local Postfix on port 25 often has no working STARTTLS cert — do not upgrade
      ignoreTLS: isLocalRelay,
      requireTLS: !isLocalRelay && config.port === 587,
      tls: {
        rejectUnauthorized: false,
      },
      debug: enableDebug,
      logger: enableDebug,
    });
  }

  static classifySmtpError(err: unknown): string {
    const error = err as { message?: string; code?: string; responseCode?: number };
    const msg = (error?.message || '').toLowerCase();
    const code = error?.code || '';

    if (code === 'EAUTH' || msg.includes('authentication') || msg.includes('invalid login')) {
      return 'SMTP Authentication Failed';
    }
    if (code === 'ETIMEDOUT' || msg.includes('timeout')) {
      return 'Connection Timeout';
    }
    if (code === 'ENOTFOUND' || msg.includes('getaddrinfo')) {
      return 'Host Not Found';
    }
    if (msg.includes('tls') || msg.includes('ssl') || msg.includes('certificate')) {
      return 'TLS Handshake Failed';
    }
    if (msg.includes('recipient') || code === 'EENVELOPE' || error?.responseCode === 550) {
      return 'Recipient Rejected';
    }
    if (msg.includes('encryption key')) {
      return 'Server Encryption Key Not Configured';
    }
    if (msg.includes('credential not found')) {
      return 'SMTP Credential Not Found';
    }
    if (msg.includes('unauthorized credential')) {
      return 'Unauthorized SMTP Credential Access';
    }
    if (msg.includes('dns')) {
      return 'DNS Lookup Failed';
    }

    return error?.message || 'Email Delivery Failed';
  }

  static async verifyTransporter(transporter: Transporter): Promise<void> {
    await transporter.verify();
  }
}

export default SmtpTransportService;
