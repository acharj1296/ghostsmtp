import { BaseRepository } from './base.repository';
import { SuppressionModel, ISuppression } from '../models/suppression.model';

export class SuppressionRepository extends BaseRepository<ISuppression> {
  constructor() {
    super(SuppressionModel);
  }

  async findByEmail(workspaceId: string, email: string): Promise<ISuppression | null> {
    return this.findOne({ workspaceId, email: email.toLowerCase() });
  }

  // Override delete to do hard delete for suppression list entries
  override async delete(id: string): Promise<ISuppression | null> {
    return this.model.findByIdAndDelete(id).exec();
  }
}
