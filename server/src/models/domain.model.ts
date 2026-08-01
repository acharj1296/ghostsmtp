import { Schema, model, Document, Types } from 'mongoose';

export interface IDomain extends Document {
  workspaceId: Types.ObjectId;
  name: string; // e.g. 'domain.com'
  verified: boolean;
  dkimSelector: string;
  dkimPrivateKey: string;
  dkimPublicKey: string;
  spfVerified: boolean;
  dkimVerified: boolean;
  dmarcVerified: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DomainSchema = new Schema<IDomain>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    verified: { type: Boolean, required: true, default: false },
    dkimSelector: { type: String, required: true, default: 'ghost' },
    dkimPrivateKey: { type: String, required: true },
    dkimPublicKey: { type: String, required: true },
    spfVerified: { type: Boolean, required: true, default: false },
    dkimVerified: { type: Boolean, required: true, default: false },
    dmarcVerified: { type: Boolean, required: true, default: false },
    isDeleted: { type: Boolean, required: true, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Compound index for tenant-isolated lookups
DomainSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

DomainSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

DomainSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

export const DomainModel = model<IDomain>('Domain', DomainSchema);
export default DomainModel;
