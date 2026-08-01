import { Schema, model, Document, Types } from 'mongoose';

export interface IDomain extends Document {
  workspaceId: Types.ObjectId;
  name: string; // e.g. 'domain.com'
  status: 'pending' | 'verified' | 'failed';
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DomainSchema = new Schema<IDomain>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    status: { type: String, required: true, default: 'pending', enum: ['pending', 'verified', 'failed'], index: true },
    isDeleted: { type: Boolean, required: true, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Query helpers to exclude soft deleted domains
DomainSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

DomainSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

export const DomainModel = model<IDomain>('Domain', DomainSchema);
export default DomainModel;
