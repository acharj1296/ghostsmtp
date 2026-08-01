import { Schema, model, Document, Types } from 'mongoose';

export interface IDkimKey extends Document {
  domainId: Types.ObjectId;
  selector: string;
  privateKey: string;
  publicKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const DkimKeySchema = new Schema<IDkimKey>(
  {
    domainId: { type: Schema.Types.ObjectId, ref: 'Domain', required: true, unique: true, index: true },
    selector: { type: String, required: true, default: 'ghost' },
    privateKey: { type: String, required: true },
    publicKey: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const DkimKeyModel = model<IDkimKey>('DkimKey', DkimKeySchema);
export default DkimKeyModel;
