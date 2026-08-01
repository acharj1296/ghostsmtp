import { BaseRepository } from './base.repository';
import { TemplateModel, ITemplate } from '../models/template.model';

export class TemplateRepository extends BaseRepository<ITemplate> {
  constructor() {
    super(TemplateModel);
  }

  async findByWorkspace(workspaceId: string): Promise<ITemplate[]> {
    return this.find({ workspaceId });
  }
}
