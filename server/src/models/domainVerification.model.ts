import { Schema, model, Document, Types } from 'mongoose';

export interface IDomainVerification extends Document {
  domainId: Types.ObjectId;

  // Expected DNS values (what user should set)
  spfRecord: string;
  dkimRecord: string;
  dmarcRecord: string;
  mxRecord: string;
  cnameRecord: string;

  // Extended expected records (production DNS set)
  trackingCname: string;
  bounceCname: string;
  returnPathRecord: string;
  autoconfigCname: string;
  autodiscoverRecord: string;
  mailFrom: string;
  dmarcPolicy: 'none' | 'quarantine' | 'reject';

  // Verification status
  spfVerified: boolean;
  dkimVerified: boolean;
  dmarcVerified: boolean;
  mxVerified: boolean;
  cnameVerified: boolean;
  trackingVerified: boolean;
  bounceVerified: boolean;
  returnPathVerified: boolean;
  autoconfigVerified: boolean;
  autodiscoverVerified: boolean;

  // Detailed verification output
  verificationResults?: Record<string, any>[];
  verificationErrors?: string[];

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

    trackingCname: { type: String, default: '' },
    bounceCname: { type: String, default: '' },
    returnPathRecord: { type: String, default: '' },
    autoconfigCname: { type: String, default: '' },
    autodiscoverRecord: { type: String, default: '' },
    mailFrom: { type: String, default: '' },
    dmarcPolicy: { type: String, default: 'none', enum: ['none', 'quarantine', 'reject'] },

    spfVerified: { type: Boolean, required: true, default: false },
    dkimVerified: { type: Boolean, required: true, default: false },
    dmarcVerified: { type: Boolean, required: true, default: false },
    mxVerified: { type: Boolean, required: true, default: false },
    cnameVerified: { type: Boolean, required: true, default: false },
    trackingVerified: { type: Boolean, required: true, default: false },
    bounceVerified: { type: Boolean, required: true, default: false },
    returnPathVerified: { type: Boolean, required: true, default: false },
    autoconfigVerified: { type: Boolean, required: true, default: false },
    autodiscoverVerified: { type: Boolean, required: true, default: false },

    verificationResults: { type: [Schema.Types.Mixed], default: [] },
    verificationErrors: { type: [String], default: [] },
    lastVerifiedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const DomainVerificationModel = model<IDomainVerification>('DomainVerification', DomainVerificationSchema);
export default DomainVerificationModel;
