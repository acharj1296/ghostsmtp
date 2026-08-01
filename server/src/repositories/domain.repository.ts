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

  async findVerifiedGlobally(name: string): Promise<IDomain | null> {
    return this.model.findOne({ name, status: 'verified', isDeleted: false }).exec();
  }

  async findByWorkspaceAndId(workspaceId: string, id: string): Promise<IDomain | null> {
    return this.findOne({ _id: id, workspaceId });
  }
}
