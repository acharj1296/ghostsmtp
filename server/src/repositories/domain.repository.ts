import { BaseRepository } from './base.repository';
import { DomainModel, IDomain } from '../models/domain.model';

export class DomainRepository extends BaseRepository<IDomain> {
  constructor() {
    super(DomainModel);
  }

  async findByWorkspace(workspaceId: string): Promise<IDomain[]> {
    return this.find({ workspaceId });
  }

  async findByName(workspaceId: string, name: string): Promise<IDomain | null> {
    return this.findOne({ workspaceId, name });
  }
}
