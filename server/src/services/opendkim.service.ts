import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

export interface OpenDkimSyncResult {
  synced: boolean;
  keyPath?: string;
  /** Error only when the sync could not be completed (never throws). */
  error?: string;
}

/**
 * Bridges the Node.js DKIM key generation with the OpenDKIM milter container.
 *
 * When a domain is created the API generates an RSA keypair. For OpenDKIM to
 * actually sign outbound mail, that private key must exist on disk where the
 * milter expects it, and both KeyTable and SigningTable must map the domain to
 * the key. All three live on shared volumes so the `opendkim` container and the
 * API/worker containers see the same files.
 *
 * Synchronization is best-effort: a failure here must NEVER block domain
 * creation. When running outside Docker (or when the shared volume is not
 * mounted) the sync simply reports an error and the caller proceeds.
 */
export class OpenDkimService {
  private keysDir = env.DKIM_KEYS_PATH;
  private keyTablePath = env.DKIM_KEYTABLE_PATH;
  private signingTablePath = env.DKIM_SIGNINGTABLE_PATH;

  /**
   * Write a domain's private key and register it in the OpenDKIM tables.
   */
  async syncDomain(domainName: string, selector: string, privateKeyPem: string): Promise<OpenDkimSyncResult> {
    try {
      const domainDir = path.join(this.keysDir, domainName);
      await fs.promises.mkdir(domainDir, { recursive: true });

      const keyPath = path.join(domainDir, `${selector}.private`);
      // 0644 (not 0600): the API container writes as root but the OpenDKIM
      // milter drops to the `opendkim` user — the key must be world-readable
      // (never world-writable) for the milter to sign. Acceptable within the
      // shared single-host Docker volume.
      await fs.promises.writeFile(keyPath, privateKeyPem, { mode: 0o644 });

      await this.registerInKeyTable(domainName, selector);
      await this.registerInSigningTable(domainName, selector);

      return { synced: true, keyPath };
    } catch (err: any) {
      return {
        synced: false,
        error: `OpenDKIM key sync skipped: ${err?.message || 'unknown error'}`,
      };
    }
  }

  private async readTable(filePath: string): Promise<string[]> {
    try {
      const content = await fs.promises.readFile(filePath, 'utf8');
      return content.split('\n');
    } catch {
      return [];
    }
  }

  private async writeTable(filePath: string, lines: string[]): Promise<void> {
    await fs.promises.writeFile(filePath, lines.join('\n').replace(/\n{3,}/g, '\n\n') + '\n', 'utf8');
  }

  /**
   * KeyTable format:
   *   <selector>._domainkey.<domain>  <domain>:<selector>:<keyfile path>
   */
  private async registerInKeyTable(domainName: string, selector: string): Promise<void> {
    const identifier = `${selector}._domainkey.${domainName}`;
    const keyFile = path.join(this.keysDir, domainName, `${selector}.private`);
    const entry = `${identifier}\t${domainName}:${selector}:${keyFile}`;

    const lines = await this.readTable(this.keyTablePath);
    const filtered = lines.filter((l) => {
      const trimmed = l.trim();
      if (!trimmed || trimmed.startsWith('#')) return true;
      return !trimmed.startsWith(`${selector}._domainkey.${domainName}\t`);
    });
    filtered.push(entry);
    await this.writeTable(this.keyTablePath, filtered);
  }

  /**
   * SigningTable format:
   *   *@<domain>  <selector>._domainkey.<domain>
   */
  private async registerInSigningTable(domainName: string, selector: string): Promise<void> {
    const identifier = `${selector}._domainkey.${domainName}`;
    const entry = `*@${domainName}\t${identifier}`;

    const lines = await this.readTable(this.signingTablePath);
    const filtered = lines.filter((l) => {
      const trimmed = l.trim();
      if (!trimmed || trimmed.startsWith('#')) return true;
      return !trimmed.startsWith(`*@${domainName}\t`);
    });
    filtered.push(entry);
    await this.writeTable(this.signingTablePath, filtered);
  }
}

export default OpenDkimService;
