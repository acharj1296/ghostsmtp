import { Schema, model, Document, Types } from 'mongoose';

export interface IBounceEvent extends Document {
  workspaceId: Types.ObjectId;
  messageId: string;
  recipient: string;
  bounceType: 'hard' | 'soft' | 'temporary' | 'permanent';
  smtpCode?: number;
  smtpReason?: string;
  timestamp: Date;
}

const BounceEventSchema = new Schema<IBounceEvent>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    messageId: { type: String, required: true, index: true },
    recipient: { type: String, required: true, lowercase: true, trim: true, index: true },
    bounceType: {
      type: String,
      required: true,
      enum: ['hard', 'soft', 'temporary', 'permanent'],
      index: true,
    },
    smtpCode: { type: Number },
    smtpReason: { type: String },
    timestamp: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: false,
  }
);

// Enforce immutable history
BounceEventSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Immutable bounce event history violation. BounceEvents are read-only.'));
  }
  next();
});

export const BounceEventModel = model<IBounceEvent>('BounceEvent', BounceEventSchema);
export default BounceEventModel;
