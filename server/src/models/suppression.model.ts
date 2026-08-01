import { Schema, model, Document, Types } from 'mongoose';

export interface ISuppression extends Document {
  workspaceId?: Types.ObjectId; // null or omitted for global suppressions
  email: string;
  reason: 'bounce' | 'complaint' | 'manual';
  scope: 'global' | 'workspace';
  createdAt: Date;
}

const SuppressionSchema = new Schema<ISuppression>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    reason: { type: String, required: true, enum: ['bounce', 'complaint', 'manual'] },
    scope: { type: String, required: true, enum: ['global', 'workspace'], index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Unique index per email per workspace scope
SuppressionSchema.index({ workspaceId: 1, email: 1, scope: 1 }, { unique: true });

export const SuppressionModel = model<ISuppression>('Suppression', SuppressionSchema);
export default SuppressionModel;
