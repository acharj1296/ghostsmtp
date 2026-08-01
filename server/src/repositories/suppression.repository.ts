import { BaseRepository } from './base.repository';
import { SuppressionModel, ISuppression } from '../models/suppression.model';

export class SuppressionRepository extends BaseRepository<ISuppression> {
  constructor() {
    super(SuppressionModel);
  }

  async findSuppressed(workspaceId: string, email: string): Promise<ISuppression | null> {
    const cleanEmail = email.toLowerCase().trim();
    return this.model.findOne({
      $or: [
        { scope: 'global', email: cleanEmail },
        { scope: 'workspace', workspaceId, email: cleanEmail }
      ]
    }).exec();
  }

  // Override delete to do hard delete for suppression list entries
  override async delete(id: string): Promise<ISuppression | null> {
    return this.model.findByIdAndDelete(id).exec();
  }
}
