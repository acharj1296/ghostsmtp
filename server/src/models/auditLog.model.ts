import { Schema, model, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  workspaceId?: Types.ObjectId;
  userId?: Types.ObjectId;
  action: string; // e.g. 'domain.create', 'apikey.delete'
  details: Schema.Types.Mixed;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true, index: true },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // only creation
  }
);

export const AuditLogModel = model<IAuditLog>('AuditLog', AuditLogSchema);
export default AuditLogModel;
