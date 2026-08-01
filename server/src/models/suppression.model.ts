import { Schema, model, Document, Types } from 'mongoose';

export interface ISuppression extends Document {
  workspaceId: Types.ObjectId;
  email: string;
  reason: 'bounce' | 'complaint' | 'manual';
  createdAt: Date;
}

const SuppressionSchema = new Schema<ISuppression>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    reason: { type: String, required: true, enum: ['bounce', 'complaint', 'manual'] },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // only track creation
  }
);

// Compound index to quickly query suppression lists per tenant
SuppressionSchema.index({ workspaceId: 1, email: 1 }, { unique: true });

export const SuppressionModel = model<ISuppression>('Suppression', SuppressionSchema);
export default SuppressionModel;
