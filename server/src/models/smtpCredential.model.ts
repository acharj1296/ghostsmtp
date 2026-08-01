import { Schema, model, Document, Types } from 'mongoose';

export interface ISmtpCredential extends Document {
  workspaceId: Types.ObjectId;
  username: string; // smtp credentials login username
  passwordHash: string; // bcrypt/argon2 hashed
  description?: string;
  active: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SmtpCredentialSchema = new Schema<ISmtpCredential>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    description: { type: String, trim: true },
    active: { type: Boolean, required: true, default: true },
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
