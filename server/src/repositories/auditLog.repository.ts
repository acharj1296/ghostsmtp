import { BaseRepository } from './base.repository';
import { AuditLogModel, IAuditLog } from '../models/auditLog.model';

export class AuditLogRepository extends BaseRepository<IAuditLog> {
  constructor() {
    super(AuditLogModel);
  }

  async findByWorkspace(workspaceId: string): Promise<IAuditLog[]> {
    return this.find({ workspaceId });
  }
}
