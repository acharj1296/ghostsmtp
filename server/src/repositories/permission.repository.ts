import { BaseRepository } from './base.repository';
import { PermissionModel, IPermission } from '../models/permission.model';

export class PermissionRepository extends BaseRepository<IPermission> {
  constructor() {
    super(PermissionModel);
  }

  // Override delete to do hard delete for static permissions list
  override async delete(id: string): Promise<IPermission | null> {
    return this.model.findByIdAndDelete(id).exec();
  }
}
