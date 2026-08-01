import { Schema, model, Document, Types } from 'mongoose';

export interface IApiKey extends Document {
  workspaceId: Types.ObjectId;
  apiKeyId: string; // Public ID prefix of key
  keyHash: string; // Hashed value
  name: string;
  scopes: ('send' | 'read' | 'admin')[];
  status: 'active' | 'disabled' | 'revoked';
  lastUsedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    apiKeyId: { type: String, required: true, unique: true, index: true },
    keyHash: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    scopes: [{ type: String, required: true, enum: ['send', 'read', 'admin'] }],
    status: { type: String, required: true, default: 'active', enum: ['active', 'disabled', 'revoked'], index: true },
    lastUsedAt: { type: Date },
    isDeleted: { type: Boolean, required: true, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

ApiKeySchema.pre('find', function () {
  this.where({ isDeleted: false });
});

ApiKeySchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

export const ApiKeyModel = model<IApiKey>('ApiKey', ApiKeySchema);
export default ApiKeyModel;
