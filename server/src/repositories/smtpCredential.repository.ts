import { BaseRepository } from './base.repository';
import { SmtpCredentialModel, ISmtpCredential } from '../models/smtpCredential.model';

export class SmtpCredentialRepository extends BaseRepository<ISmtpCredential> {
  constructor() {
    super(SmtpCredentialModel);
  }

  async findByUsername(username: string): Promise<ISmtpCredential | null> {
    return this.findOne({ username });
  }

  async findByWorkspace(workspaceId: string): Promise<ISmtpCredential[]> {
    return this.find({ workspaceId });
  }
}
