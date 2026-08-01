import { BaseRepository } from './base.repository';
import { RoleModel, IRole } from '../models/role.model';

export class RoleRepository extends BaseRepository<IRole> {
  constructor() {
    super(RoleModel);
  }

  async findByWorkspace(workspaceId: string): Promise<IRole[]> {
    return this.find({ workspaceId });
  }
}
