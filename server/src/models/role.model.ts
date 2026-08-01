import { Schema, model, Document, Types } from 'mongoose';

export interface IRole extends Document {
  workspaceId?: Types.ObjectId; // null represents global role
  name: string; // e.g. 'Administrator', 'Developer'
  permissions: Types.ObjectId[]; // list of granted permissions
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', index: true },
    name: { type: String, required: true, trim: true },
    permissions: [{ type: Schema.Types.ObjectId, ref: 'Permission', required: true }],
    isDeleted: { type: Boolean, required: true, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

RoleSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

RoleSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

RoleSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

export const RoleModel = model<IRole>('Role', RoleSchema);
export default RoleModel;
