import { Schema, model, Document, Types } from 'mongoose';

export interface IApiKey extends Document {
  workspaceId: Types.ObjectId;
  keyHash: string; // sha256 hashed value
  name: string; // nickname, e.g. 'Production Send Key'
  scopes: string[]; // e.g. ['email:send', 'domains:read']
  lastUsedAt?: Date;
  active: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    keyHash: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    scopes: [{ type: String, required: true }],
    lastUsedAt: { type: Date },
    active: { type: Boolean, required: true, default: true },
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
