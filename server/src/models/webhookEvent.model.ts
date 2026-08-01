import { Schema, model, Document, Types } from 'mongoose';

export interface IWebhookEvent extends Document {
  workspaceId: Types.ObjectId;
  event: 'queued' | 'processing' | 'sent' | 'delivered' | 'deferred' | 'bounced' | 'complained' | 'suppressed' | 'opened' | 'clicked';
  payload: Record<string, any>;
  status: 'pending' | 'processing' | 'delivered' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    event: {
      type: String,
      required: true,
      enum: ['queued', 'processing', 'sent', 'delivered', 'deferred', 'bounced', 'complained', 'suppressed', 'opened', 'clicked'],
      index: true,
    },
    payload: { type: Schema.Types.Map, of: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      required: true,
      default: 'pending',
      enum: ['pending', 'processing', 'delivered', 'failed'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const WebhookEventModel = model<IWebhookEvent>('WebhookEvent', WebhookEventSchema);
export default WebhookEventModel;
