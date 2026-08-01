import { Schema, model, Document } from 'mongoose';

export interface IPermission extends Document {
  name: string; // e.g. 'domain:create', 'apikey:write'
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema<IPermission>(
  {
    name: { type: String, required: true, unique: true, index: true },
    description: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

export const PermissionModel = model<IPermission>('Permission', PermissionSchema);
export default PermissionModel;
