import { Schema, model, Document, Types } from 'mongoose';

export interface IDomain extends Document {
  workspaceId: Types.ObjectId;
  name: string; // e.g. 'domain.com'
  status: 'pending' | 'verified' | 'failed';

  // DKIM configuration
  dkimSelector: string; // e.g. 'ghost', 'k1'

  // Subdomain prefixes (configurable per domain)
  trackingSubdomain: string;  // default: 'tracking'
  bounceSubdomain: string;     // default: 'bounce'
  returnPathSubdomain: string; // default: 'bounce' (envelope MAIL FROM / VERP)

  // DMARC policy (graduate none -> quarantine -> reject as reputation warms)
  dmarcPolicy: 'none' | 'quarantine' | 'reject';

  // Infrastructure binding — populated at creation from env config
  mailServerHost: string; // e.g. 'mail.ghosthosting.qzz.io'
  mailServerIp: string;   // resolved IP used in SPF

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

    // DKIM selector for this domain
    dkimSelector: { type: String, required: true, default: 'ghost' },

    // Subdomain prefixes
    trackingSubdomain: { type: String, required: true, default: 'tracking' },
    bounceSubdomain: { type: String, required: true, default: 'bounce' },
    returnPathSubdomain: { type: String, required: true, default: 'bounce' },

    // DMARC policy
    dmarcPolicy: { type: String, required: true, default: 'none', enum: ['none', 'quarantine', 'reject'] },

    // Infrastructure binding
    mailServerHost: { type: String, required: true },
    mailServerIp: { type: String, required: true },

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
