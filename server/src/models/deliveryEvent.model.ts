import { Schema, model, Document, Types } from 'mongoose';

export interface IDeliveryEvent extends Document {
  workspaceId: Types.ObjectId;
  messageId: string;
  queueId: string;
  status: 'queued' | 'processing' | 'accepted' | 'sent' | 'delivered' | 'deferred' | 'bounced' | 'complained' | 'failed';
  smtpResponse?: string;
  responseCode?: number;
  remoteServer?: string;
  retryCount: number;
  timestamp: Date;
}

const DeliveryEventSchema = new Schema<IDeliveryEvent>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    messageId: { type: String, required: true, index: true },
    queueId: { type: String, required: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ['queued', 'processing', 'accepted', 'sent', 'delivered', 'deferred', 'bounced', 'complained', 'failed'],
      index: true,
    },
    smtpResponse: { type: String },
    responseCode: { type: Number },
    remoteServer: { type: String },
    retryCount: { type: Number, required: true, default: 0 },
    timestamp: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: false, // Explicitly manual timestamp based on event occurrence time
  }
);

// Enforce immutable history by preventing updates or deletions on schema middleware level
DeliveryEventSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Immutable delivery history violation. DeliveryEvents are read-only.'));
  }
  next();
});

export const DeliveryEventModel = model<IDeliveryEvent>('DeliveryEvent', DeliveryEventSchema);
export default DeliveryEventModel;
