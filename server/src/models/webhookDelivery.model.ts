import { Schema, model, Document, Types } from 'mongoose';

export interface IWebhookDelivery extends Document {
  workspaceId: Types.ObjectId;
  webhookId: Types.ObjectId;
  eventId: Types.ObjectId;
  url: string;
  payload: string;
  statusCode?: number;
  responseBody?: string;
  durationMs: number;
  retryCount: number;
  status: 'success' | 'failed';
  timestamp: Date;
}

const WebhookDeliverySchema = new Schema<IWebhookDelivery>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    webhookId: { type: Schema.Types.ObjectId, ref: 'Webhook', required: true, index: true },
    eventId: { type: Schema.Types.ObjectId, ref: 'WebhookEvent', required: true, index: true },
    url: { type: String, required: true },
    payload: { type: String, required: true },
    statusCode: { type: Number },
    responseBody: { type: String },
    durationMs: { type: Number, required: true, default: 0 },
    retryCount: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      required: true,
      enum: ['success', 'failed'],
      index: true,
    },
    timestamp: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: false,
  }
);

// Enforce immutable history for webhook delivery audits
WebhookDeliverySchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Immutable webhook delivery history violation. WebhookDeliveries are read-only.'));
  }
  next();
});

export const WebhookDeliveryModel = model<IWebhookDelivery>('WebhookDelivery', WebhookDeliverySchema);
export default WebhookDeliveryModel;
