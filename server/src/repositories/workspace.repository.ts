import { BaseRepository } from './base.repository';
import { WorkspaceModel, IWorkspace } from '../models/workspace.model';

export class WorkspaceRepository extends BaseRepository<IWorkspace> {
  constructor() {
    super(WorkspaceModel);
  }
}
