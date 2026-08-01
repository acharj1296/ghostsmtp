import { BaseRepository } from './base.repository';
import { DomainVerificationModel, IDomainVerification } from '../models/domainVerification.model';

export class DomainVerificationRepository extends BaseRepository<IDomainVerification> {
  constructor() {
    super(DomainVerificationModel);
  }

  async findByDomainId(domainId: string): Promise<IDomainVerification | null> {
    return this.findOne({ domainId });
  }

  override async delete(id: string): Promise<IDomainVerification | null> {
    return this.model.findByIdAndDelete(id).exec();
  }
}
