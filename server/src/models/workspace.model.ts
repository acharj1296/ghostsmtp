import { Schema, model, Document } from 'mongoose';

export interface IWorkspace extends Document {
  name: string;
  plan: string; // 'free' | 'growth' | 'enterprise'
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true },
    plan: { type: String, required: true, default: 'free', enum: ['free', 'growth', 'enterprise'] },
    isDeleted: { type: Boolean, required: true, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Query helpers to exclude soft deleted items by default
WorkspaceSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

WorkspaceSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

export const WorkspaceModel = model<IWorkspace>('Workspace', WorkspaceSchema);
export default WorkspaceModel;
