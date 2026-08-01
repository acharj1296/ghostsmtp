import { Schema, model, Document, Types } from 'mongoose';

export interface IComplaintEvent extends Document {
  workspaceId: Types.ObjectId;
  messageId: string;
  recipient: string;
  complaintType: 'spam' | 'abuse';
  feedbackReport?: string;
  timestamp: Date;
}

const ComplaintEventSchema = new Schema<IComplaintEvent>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    messageId: { type: String, required: true, index: true },
    recipient: { type: String, required: true, lowercase: true, trim: true, index: true },
    complaintType: {
      type: String,
      required: true,
      enum: ['spam', 'abuse'],
      index: true,
    },
    feedbackReport: { type: String },
    timestamp: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: false,
  }
);

// Enforce immutable history
ComplaintEventSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('Immutable complaint event history violation. ComplaintEvents are read-only.'));
  }
  next();
});

export const ComplaintEventModel = model<IComplaintEvent>('ComplaintEvent', ComplaintEventSchema);
export default ComplaintEventModel;
