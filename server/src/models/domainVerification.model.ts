import { Schema, model, Document, Types } from 'mongoose';

export interface IDomainVerification extends Document {
  domainId: Types.ObjectId;
  spfRecord: string;
  dkimRecord: string;
  dmarcRecord: string;
  mxRecord: string;
  cnameRecord: string;
  spfVerified: boolean;
  dkimVerified: boolean;
  dmarcVerified: boolean;
  mxVerified: boolean;
  cnameVerified: boolean;
  lastVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DomainVerificationSchema = new Schema<IDomainVerification>(
  {
    domainId: { type: Schema.Types.ObjectId, ref: 'Domain', required: true, unique: true, index: true },
    spfRecord: { type: String, required: true },
    dkimRecord: { type: String, required: true },
    dmarcRecord: { type: String, required: true },
    mxRecord: { type: String, required: true },
    cnameRecord: { type: String, required: true },
    spfVerified: { type: Boolean, required: true, default: false },
    dkimVerified: { type: Boolean, required: true, default: false },
    dmarcVerified: { type: Boolean, required: true, default: false },
    mxVerified: { type: Boolean, required: true, default: false },
    cnameVerified: { type: Boolean, required: true, default: false },
    lastVerifiedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const DomainVerificationModel = model<IDomainVerification>('DomainVerification', DomainVerificationSchema);
export default DomainVerificationModel;
