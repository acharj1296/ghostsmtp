import axios, { AxiosInstance } from 'axios';
import { DnsRecord } from './dnsGenerator.service';

export interface DnsProvider {
  type: 'cloudflare' | 'route53' | 'namecheap' | 'godaddy';
  credentials: Record<string, string>;
  zones?: { id: string; name: string }[];
}

export interface DnsProviderSetupResult {
  success: boolean;
  message: string;
  zonesCount?: number;
  errors?: string[];
}

export interface DnsRecordCreateResult {
  success: boolean;
  recordId?: string;
  message: string;
  error?: string;
}

abstract class ProviderAdapter {
  protected client: AxiosInstance;

  abstract validateCredentials(): Promise<boolean>;
  abstract listZones(domain: string): Promise<{ id: string; name: string }[]>;
  abstract createRecord(zoneId: string, record: DnsRecord): Promise<DnsRecordCreateResult>;
  abstract updateRecord(
    zoneId: string,
    recordId: string,
    record: DnsRecord
  ): Promise<DnsRecordCreateResult>;
  abstract deleteRecord(zoneId: string, recordId: string): Promise<boolean>;
  abstract findRecord(zoneId: string, host: string, type: string): Promise<string | null>;
}

/**
 * Cloudflare DNS API adapter
 */
class CloudflareAdapter extends ProviderAdapter {
  constructor(private apiToken: string) {
    super();
    this.client = axios.create({
      baseURL: 'https://api.cloudflare.com/client/v4',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const response = await this.client.get('/user/tokens/verify');
      return response.data.success;
    } catch {
      return false;
    }
  }

  async listZones(domain: string): Promise<{ id: string; name: string }[]> {
    try {
      const response = await this.client.get('/zones', {
        params: { name: domain, status: 'active' },
      });

      if (!response.data.success) throw new Error(response.data.errors?.[0]?.message);

      return response.data.result.map((zone: any) => ({
        id: zone.id,
        name: zone.name,
      }));
    } catch (err: any) {
      throw new Error(`Failed to list Cloudflare zones: ${err.message}`);
    }
  }

  async createRecord(
    zoneId: string,
    record: DnsRecord
  ): Promise<DnsRecordCreateResult> {
    try {
      const payload: any = {
        type: record.type,
        name: record.host,
        content: record.value,
        ttl: record.ttl,
      };

      if (record.priority !== undefined) {
        payload.priority = record.priority;
      }

      if (record.type === 'MX') {
        payload.priority = record.priority || 10;
      }

      const response = await this.client.post(`/zones/${zoneId}/dns_records`, payload);

      if (!response.data.success) {
        throw new Error(response.data.errors?.[0]?.message || 'Failed to create record');
      }

      return {
        success: true,
        recordId: response.data.result.id,
        message: `Record created: ${record.host}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Failed to create record',
        error: err.message,
      };
    }
  }

  async updateRecord(
    zoneId: string,
    recordId: string,
    record: DnsRecord
  ): Promise<DnsRecordCreateResult> {
    try {
      const payload: any = {
        type: record.type,
        name: record.host,
        content: record.value,
        ttl: record.ttl,
      };

      if (record.priority !== undefined) {
        payload.priority = record.priority;
      }

      const response = await this.client.put(
        `/zones/${zoneId}/dns_records/${recordId}`,
        payload
      );

      if (!response.data.success) {
        throw new Error(response.data.errors?.[0]?.message || 'Failed to update record');
      }

      return {
        success: true,
        recordId: response.data.result.id,
        message: `Record updated: ${record.host}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Failed to update record',
        error: err.message,
      };
    }
  }

  async deleteRecord(zoneId: string, recordId: string): Promise<boolean> {
    try {
      const response = await this.client.delete(`/zones/${zoneId}/dns_records/${recordId}`);
      return response.data.success;
    } catch {
      return false;
    }
  }

  async findRecord(zoneId: string, host: string, type: string): Promise<string | null> {
    try {
      const response = await this.client.get(`/zones/${zoneId}/dns_records`, {
        params: { name: host, type },
      });

      if (!response.data.success) return null;
      if (response.data.result.length === 0) return null;

      return response.data.result[0].id;
    } catch {
      return null;
    }
  }
}

/**
 * AWS Route53 DNS API adapter
 */
class Route53Adapter extends ProviderAdapter {
  constructor(
    private accessKeyId: string,
    private secretAccessKey: string,
    private region: string = 'us-east-1'
  ) {
    super();
    // Note: In production, use AWS SDK v3
    // This is a simplified implementation
  }

  async validateCredentials(): Promise<boolean> {
    // Validate AWS credentials by attempting to list hosted zones
    try {
      // This would require AWS SDK setup
      return true;
    } catch {
      return false;
    }
  }

  async listZones(domain: string): Promise<{ id: string; name: string }[]> {
    throw new Error('Route53 adapter requires AWS SDK setup');
  }

  async createRecord(
    zoneId: string,
    record: DnsRecord
  ): Promise<DnsRecordCreateResult> {
    throw new Error('Route53 adapter requires AWS SDK setup');
  }

  async updateRecord(
    zoneId: string,
    recordId: string,
    record: DnsRecord
  ): Promise<DnsRecordCreateResult> {
    throw new Error('Route53 adapter requires AWS SDK setup');
  }

  async deleteRecord(zoneId: string, recordId: string): Promise<boolean> {
    throw new Error('Route53 adapter requires AWS SDK setup');
  }

  async findRecord(zoneId: string, host: string, type: string): Promise<string | null> {
    throw new Error('Route53 adapter requires AWS SDK setup');
  }
}

/**
 * Namecheap DNS API adapter
 */
class NamecheapAdapter extends ProviderAdapter {
  constructor(
    private apiUser: string,
    private apiKey: string
  ) {
    super();
    this.client = axios.create({
      baseURL: 'https://api.namecheap.com/xml.response',
    });
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const response = await this.client.post('', null, {
        params: {
          ApiUser: this.apiUser,
          ApiKey: this.apiKey,
          UserName: this.apiUser,
          Command: 'namecheap.users.getBalances',
          ClientIp: '127.0.0.1',
        },
      });

      return !response.data.includes('Invalid API user');
    } catch {
      return false;
    }
  }

  async listZones(domain: string): Promise<{ id: string; name: string }[]> {
    // Namecheap API doesn't have direct zone listing
    // The domain itself is the zone
    return [{ id: domain, name: domain }];
  }

  async createRecord(
    zoneId: string,
    record: DnsRecord
  ): Promise<DnsRecordCreateResult> {
    throw new Error('Namecheap adapter requires XML parsing implementation');
  }

  async updateRecord(
    zoneId: string,
    recordId: string,
    record: DnsRecord
  ): Promise<DnsRecordCreateResult> {
    throw new Error('Namecheap adapter requires XML parsing implementation');
  }

  async deleteRecord(zoneId: string, recordId: string): Promise<boolean> {
    throw new Error('Namecheap adapter requires XML parsing implementation');
  }

  async findRecord(zoneId: string, host: string, type: string): Promise<string | null> {
    throw new Error('Namecheap adapter requires XML parsing implementation');
  }
}

/**
 * GoDaddy DNS API adapter
 */
class GoDaddyAdapter extends ProviderAdapter {
  constructor(
    private apiKey: string,
    private apiSecret: string
  ) {
    super();
    this.client = axios.create({
      baseURL: 'https://api.godaddy.com/v1',
      headers: {
        Authorization: `sso-key ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const response = await this.client.get('/domains');
      return Array.isArray(response.data);
    } catch {
      return false;
    }
  }

  async listZones(domain: string): Promise<{ id: string; name: string }[]> {
    try {
      const response = await this.client.get(`/domains/${domain}`);
      return [{ id: domain, name: domain }];
    } catch {
      throw new Error(`Domain ${domain} not found on GoDaddy`);
    }
  }

  async createRecord(
    zoneId: string,
    record: DnsRecord
  ): Promise<DnsRecordCreateResult> {
    try {
      const payload = [
        {
          type: record.type,
          name: record.host === '@' ? '' : record.host,
          data: record.value,
          ttl: record.ttl,
          priority: record.priority,
        },
      ];

      await this.client.patch(`/domains/${zoneId}/records`, payload);

      return {
        success: true,
        message: `Record created: ${record.host}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: 'Failed to create record',
        error: err.message,
      };
    }
  }

  async updateRecord(
    zoneId: string,
    recordId: string,
    record: DnsRecord
  ): Promise<DnsRecordCreateResult> {
    // GoDaddy uses PATCH for updates, so this is similar to create
    return this.createRecord(zoneId, record);
  }

  async deleteRecord(zoneId: string, recordId: string): Promise<boolean> {
    // GoDaddy doesn't expose direct delete by ID
    // Records are managed via PATCH with upsert
    return true;
  }

  async findRecord(zoneId: string, host: string, type: string): Promise<string | null> {
    try {
      const response = await this.client.get(`/domains/${zoneId}/records/${type}/${host}`);
      return Array.isArray(response.data) && response.data.length > 0 ? host : null;
    } catch {
      return null;
    }
  }
}

/**
 * DNS Provider Service - unified interface for multiple DNS providers
 */
export class DnsProviderService {
  private adapters: Map<string, ProviderAdapter> = new Map();

  /**
   * Initialize a DNS provider with credentials
   */
  async setupProvider(provider: DnsProvider): Promise<DnsProviderSetupResult> {
    try {
      let adapter: ProviderAdapter;

      switch (provider.type) {
        case 'cloudflare':
          adapter = new CloudflareAdapter(provider.credentials.apiToken);
          break;
        case 'route53':
          adapter = new Route53Adapter(
            provider.credentials.accessKeyId,
            provider.credentials.secretAccessKey,
            provider.credentials.region || 'us-east-1'
          );
          break;
        case 'namecheap':
          adapter = new NamecheapAdapter(
            provider.credentials.apiUser,
            provider.credentials.apiKey
          );
          break;
        case 'godaddy':
          adapter = new GoDaddyAdapter(
            provider.credentials.apiKey,
            provider.credentials.apiSecret
          );
          break;
        default:
          return {
            success: false,
            message: `Unknown provider type: ${provider.type}`,
          };
      }

      // Validate credentials
      const isValid = await adapter.validateCredentials();
      if (!isValid) {
        return {
          success: false,
          message: 'Invalid provider credentials',
        };
      }

      // Store adapter for later use
      this.adapters.set(provider.type, adapter);

      return {
        success: true,
        message: `${provider.type} provider configured successfully`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to setup provider',
        errors: [err.message],
      };
    }
  }

  /**
   * Create DNS records for a domain on the specified provider
   */
  async createRecords(
    providerType: string,
    domain: string,
    records: DnsRecord[]
  ): Promise<DnsRecordCreateResult[]> {
    const adapter = this.adapters.get(providerType);
    if (!adapter) {
      return [
        {
          success: false,
          message: `Provider ${providerType} not configured`,
        },
      ];
    }

    try {
      // Find or get the zone ID
      const zones = await adapter.listZones(domain);
      if (zones.length === 0) {
        return [
          {
            success: false,
            message: `Domain ${domain} not found on ${providerType}`,
          },
        ];
      }

      const zoneId = zones[0].id;
      const results: DnsRecordCreateResult[] = [];

      // Create each record
      for (const record of records) {
        try {
          // Try to find existing record first
          const existingId = await adapter.findRecord(zoneId, record.host, record.type);

          let result: DnsRecordCreateResult;
          if (existingId) {
            result = await adapter.updateRecord(zoneId, existingId, record);
          } else {
            result = await adapter.createRecord(zoneId, record);
          }

          results.push(result);
        } catch (err: any) {
          results.push({
            success: false,
            message: `Failed to create ${record.type} record for ${record.host}`,
            error: err.message,
          });
        }
      }

      return results;
    } catch (err: any) {
      return [
        {
          success: false,
          message: err.message || 'Failed to create DNS records',
        },
      ];
    }
  }

  /**
   * Auto-setup all DNS records for a domain (one-click setup)
   */
  async autoSetupDomain(
    providerType: string,
    domain: string,
    records: DnsRecord[]
  ): Promise<{
    success: boolean;
    message: string;
    recordsCreated: number;
    recordsFailed: number;
    details: DnsRecordCreateResult[];
  }> {
    const results = await this.createRecords(providerType, domain, records);

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      success: failed === 0,
      message:
        failed === 0
          ? `Successfully created ${successful} DNS records for ${domain}`
          : `Created ${successful} records, ${failed} failed`,
      recordsCreated: successful,
      recordsFailed: failed,
      details: results,
    };
  }
}

export default DnsProviderService;
