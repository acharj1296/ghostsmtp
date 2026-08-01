import { BaseRepository } from './base.repository';
import { ApiKeyModel, IApiKey } from '../models/apiKey.model';

export class ApiKeyRepository extends BaseRepository<IApiKey> {
  constructor() {
    super(ApiKeyModel);
  }

  async findByKeyHash(keyHash: string): Promise<IApiKey | null> {
    return this.findOne({ keyHash, active: true });
  }

  async findByWorkspace(workspaceId: string): Promise<IApiKey[]> {
    return this.find({ workspaceId });
  }
}
