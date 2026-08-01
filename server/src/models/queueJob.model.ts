import { Schema, model, Document, Types } from 'mongoose';

export interface IQueueJob extends Document {
  workspaceId: Types.ObjectId;
  jobId: string; // BullMQ internal Job ID
  messageId: string; // Unique application-level message UUID
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'retrying' | 'cancelled';
  retryCount: number;
  maxRetries: number;
  errorInfo?: string;
  payload: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const QueueJobSchema = new Schema<IQueueJob>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    jobId: { type: String, required: true, unique: true, index: true },
    messageId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      required: true,
      default: 'pending',
      enum: ['pending', 'queued', 'processing', 'completed', 'failed', 'retrying', 'cancelled'],
      index: true,
    },
    retryCount: { type: Number, required: true, default: 0 },
    maxRetries: { type: Number, required: true, default: 3 },
    errorInfo: { type: String },
    payload: { type: Schema.Types.Map, of: Schema.Types.Mixed, required: true },
  },
  {
    timestamps: true,
  }
);

export const QueueJobModel = model<IQueueJob>('QueueJob', QueueJobSchema);
export default QueueJobModel;
