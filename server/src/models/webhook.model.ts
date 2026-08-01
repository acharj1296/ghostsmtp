import { Schema, model, Document, Types } from 'mongoose';

export interface IWebhook extends Document {
  workspaceId: Types.ObjectId;
  url: string;
  secret: string; // HMAC secret
  events: string[]; // e.g. ['email.delivered', 'email.bounced']
  active: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookSchema = new Schema<IWebhook>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    url: { type: String, required: true, trim: true },
    secret: { type: String, required: true },
    events: [{ type: String, required: true }],
    active: { type: Boolean, required: true, default: true },
    isDeleted: { type: Boolean, required: true, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

WebhookSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

WebhookSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

export const WebhookModel = model<IWebhook>('Webhook', WebhookSchema);
export default WebhookModel;
