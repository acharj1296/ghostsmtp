import { Schema, model, Document, Types } from 'mongoose';

export interface IEmailLog extends Document {
  workspaceId: Types.ObjectId;
  domainId?: Types.ObjectId;
  sender: string;
  recipient: string;
  subject: string;
  status: 'queued' | 'processing' | 'sent' | 'failed';
  retryCount: number;
  messageId: string; // Unique SMTP Message ID
  smtpResponse?: string;
  errorReason?: string;
  deliveryMetadata?: Record<string, any>;
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
      default: 'queued',
      enum: ['queued', 'processing', 'sent', 'failed'],
      index: true,
    },
    retryCount: { type: Number, required: true, default: 0 },
    messageId: { type: String, required: true, unique: true, index: true },
    smtpResponse: { type: String },
    errorReason: { type: String },
    deliveryMetadata: { type: Schema.Types.Map, of: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for analytics metrics
EmailLogSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });

export const EmailLogModel = model<IEmailLog>('EmailLog', EmailLogSchema);
export default EmailLogModel;
