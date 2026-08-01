import { BaseRepository } from './base.repository';
import { DkimKeyModel, IDkimKey } from '../models/dkimKey.model';

export class DkimKeyRepository extends BaseRepository<IDkimKey> {
  constructor() {
    super(DkimKeyModel);
  }

  async findByDomainId(domainId: string): Promise<IDkimKey | null> {
    return this.findOne({ domainId });
  }

  override async delete(id: string): Promise<IDkimKey | null> {
    return this.model.findByIdAndDelete(id).exec();
  }
}
