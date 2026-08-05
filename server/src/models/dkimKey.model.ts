import { Schema, model, Document, Types } from 'mongoose';

export interface IDkimKey extends Document {
  domainId: Types.ObjectId;
  selector: string;
  privateKey: string;       // Encrypted at rest
  publicKey: string;        // PEM, stripped for DNS TXT
  keySize: number;          // 2048 or 4096
  isActive: boolean;
  generatedAt: Date;
  expiresAt?: Date;         // For key rotation
  opendkimPath?: string;    // Path inside OpenDKIM container
  createdAt: Date;
  updatedAt: Date;
}

const DkimKeySchema = new Schema<IDkimKey>(
  {
    domainId: { type: Schema.Types.ObjectId, ref: 'Domain', required: true, unique: true, index: true },
    selector: { type: String, required: true, default: 'ghost' },
    privateKey: { type: String, required: true },
    publicKey: { type: String, required: true },
    keySize: { type: Number, required: true, default: 2048 },
    isActive: { type: Boolean, required: true, default: true },
    generatedAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date },
    opendkimPath: { type: String },
  },
  {
    timestamps: true,
  }
);

export const DkimKeyModel = model<IDkimKey>('DkimKey', DkimKeySchema);
export default DkimKeyModel;
