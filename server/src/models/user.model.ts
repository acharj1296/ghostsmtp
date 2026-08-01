import { Schema, model, Document, Types } from 'mongoose';

export interface IUserWorkspace {
  workspaceId: Types.ObjectId;
  role: string; // 'owner' | 'admin' | 'developer'
}

export interface IUser extends Document {
  firebaseUid: string;
  email: string;
  name: string;
  workspaces: IUserWorkspace[];
  active: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    workspaces: [
      {
        workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
        role: { type: String, required: true, enum: ['owner', 'admin', 'developer'] },
      },
    ],
    active: { type: Boolean, required: true, default: true },
    isDeleted: { type: Boolean, required: true, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

UserSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

UserSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

export const UserModel = model<IUser>('User', UserSchema);
export default UserModel;
