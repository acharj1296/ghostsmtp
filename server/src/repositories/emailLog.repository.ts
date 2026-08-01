import { BaseRepository } from './base.repository';
import { EmailLogModel, IEmailLog } from '../models/emailLog.model';

export class EmailLogRepository extends BaseRepository<IEmailLog> {
  constructor() {
    super(EmailLogModel);
  }

  async findByWorkspace(workspaceId: string): Promise<IEmailLog[]> {
    return this.find({ workspaceId });
  }

  async findByMessageId(messageId: string): Promise<IEmailLog | null> {
    return this.findOne({ messageId });
  }
}
