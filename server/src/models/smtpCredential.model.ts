import { Schema, model, Document, Types } from 'mongoose';

export interface ISmtpCredential extends Document {
  workspaceId: Types.ObjectId;

  // Legacy/local SMTP relay fields (used for authenticating to local Postfix)
  username?: string;
  passwordHash?: string;

  // External SMTP server configuration (for outbound relaying per-credential)
  host?: string;
  port?: number;
  secure?: boolean;
  smtpUsername?: string; // username to use when authenticating to upstream SMTP
  encryptedPassword?: string; // AES-encrypted password for upstream SMTP
  authenticationType?: 'plain' | 'login' | 'oauth';

  description?: string;
  status: 'active' | 'disabled';
  lastUsedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SmtpCredentialSchema = new Schema<ISmtpCredential>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },

    // Legacy/local fields (keep for existing SMTP auth flow)
    username: { type: String, unique: true, index: true },
    passwordHash: { type: String },

    // External SMTP configuration
    host: { type: String, trim: true },
    port: { type: Number },
    secure: { type: Boolean, default: false },
    smtpUsername: { type: String, trim: true },
    encryptedPassword: { type: String },
    authenticationType: { type: String, enum: ['plain', 'login', 'oauth'], default: 'plain' },

    description: { type: String, trim: true },
    status: { type: String, required: true, default: 'active', enum: ['active', 'disabled'], index: true },
    lastUsedAt: { type: Date },
    isDeleted: { type: Boolean, required: true, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

SmtpCredentialSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

SmtpCredentialSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

export const SmtpCredentialModel = model<ISmtpCredential>('SmtpCredential', SmtpCredentialSchema);
export default SmtpCredentialModel;
