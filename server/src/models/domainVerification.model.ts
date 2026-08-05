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

  // New production-grade DNS records
  mailARecord: string;
  mailAAAARecord?: string;
  smtpCname: string;
  imapCname: string;
  pop3Cname: string;
  webmailCname: string;
  mtaStsRecord: string;
  tlsRptRecord: string;
  caaRecord?: string;
  bimiRecord?: string;

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

  // New verification status flags
  mailAVerified: boolean;
  mailAAAAVerified: boolean;
  smtpVerified: boolean;
  imapVerified: boolean;
  pop3Verified: boolean;
  webmailVerified: boolean;
  mtaStsVerified: boolean;
  tlsRptVerified: boolean;
  caaVerified: boolean;
  bimiVerified: boolean;

  // DNS health and deliverability metrics
  healthScore?: number; // 0-100
  deliverabilityStatus?: 'excellent' | 'good' | 'needs_improvement' | 'critical';
  dnssecEnabled?: boolean;
  ptrRecord?: string;

  // Detailed verification output
  verificationResults?: Record<string, any>[];
  verificationErrors?: string[];

  lastVerifiedAt?: Date;
  lastHealthScoreAt?: Date;
  lastDeliverabilityCheckAt?: Date;
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

    // New production-grade DNS records
    mailARecord: { type: String, default: '' },
    mailAAAARecord: { type: String, default: '' },
    smtpCname: { type: String, default: '' },
    imapCname: { type: String, default: '' },
    pop3Cname: { type: String, default: '' },
    webmailCname: { type: String, default: '' },
    mtaStsRecord: { type: String, default: '' },
    tlsRptRecord: { type: String, default: '' },
    caaRecord: { type: String, default: '' },
    bimiRecord: { type: String, default: '' },

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

    // New verification status flags
    mailAVerified: { type: Boolean, required: true, default: false },
    mailAAAAVerified: { type: Boolean, required: true, default: false },
    smtpVerified: { type: Boolean, required: true, default: false },
    imapVerified: { type: Boolean, required: true, default: false },
    pop3Verified: { type: Boolean, required: true, default: false },
    webmailVerified: { type: Boolean, required: true, default: false },
    mtaStsVerified: { type: Boolean, required: true, default: false },
    tlsRptVerified: { type: Boolean, required: true, default: false },
    caaVerified: { type: Boolean, required: true, default: false },
    bimiVerified: { type: Boolean, required: true, default: false },

    // DNS health and deliverability metrics
    healthScore: { type: Number, min: 0, max: 100 },
    deliverabilityStatus: { type: String, enum: ['excellent', 'good', 'needs_improvement', 'critical'] },
    dnssecEnabled: { type: Boolean, default: false },
    ptrRecord: { type: String, default: '' },

    verificationResults: { type: [Schema.Types.Mixed], default: [] },
    verificationErrors: { type: [String], default: [] },
    lastVerifiedAt: { type: Date },
    lastHealthScoreAt: { type: Date },
    lastDeliverabilityCheckAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const DomainVerificationModel = model<IDomainVerification>('DomainVerification', DomainVerificationSchema);
export default DomainVerificationModel;
