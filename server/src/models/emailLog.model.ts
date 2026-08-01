import { Schema, model, Document, Types } from 'mongoose';

export interface IEmailLog extends Document {
  workspaceId: Types.ObjectId;
  domainId?: Types.ObjectId;
  sender: string;
  recipient: string;
  subject: string;
  status: 'queued' | 'sent' | 'delivered' | 'bounced' | 'complaint' | 'failed';
  errorReason?: string;
  messageId?: string;
  smtpStatusCode?: number;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const EmailLogSchema = new Schema<IEmailLog>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    domainId: { type: Schema.Types.ObjectId, ref: 'Domain' },
    sender: { type: String, required: true, trim: true, index: true },
    recipient: { type: String, required: true, trim: true, index: true },
    subject: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['queued', 'sent', 'delivered', 'bounced', 'complaint', 'failed'],
      index: true,
    },
    errorReason: { type: String },
    messageId: { type: String, index: true },
    smtpStatusCode: { type: Number },
    retryCount: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for metrics
EmailLogSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });

export const EmailLogModel = model<IEmailLog>('EmailLog', EmailLogSchema);
export default EmailLogModel;
