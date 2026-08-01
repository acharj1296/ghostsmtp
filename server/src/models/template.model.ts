import { Schema, model, Document, Types } from 'mongoose';

export interface ITemplate extends Document {
  workspaceId: Types.ObjectId;
  name: string;
  htmlContent?: string;
  textContent?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateSchema = new Schema<ITemplate>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true },
    htmlContent: { type: String },
    textContent: { type: String },
    isDeleted: { type: Boolean, required: true, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Compound index for uniqueness of template name per workspace
TemplateSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

TemplateSchema.pre('find', function () {
  this.where({ isDeleted: false });
});

TemplateSchema.pre('findOne', function () {
  this.where({ isDeleted: false });
});

export const TemplateModel = model<ITemplate>('Template', TemplateSchema);
export default TemplateModel;
