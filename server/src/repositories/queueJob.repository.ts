import { BaseRepository } from './base.repository';
import { QueueJobModel, IQueueJob } from '../models/queueJob.model';

export class QueueJobRepository extends BaseRepository<IQueueJob> {
  constructor() {
    super(QueueJobModel);
  }

  async findByJobId(jobId: string): Promise<IQueueJob | null> {
    return this.findOne({ jobId });
  }

  async findByMessageId(messageId: string): Promise<IQueueJob | null> {
    return this.findOne({ messageId });
  }

  async findByWorkspace(workspaceId: string): Promise<IQueueJob[]> {
    return this.find({ workspaceId });
  }
}
export default QueueJobRepository;
