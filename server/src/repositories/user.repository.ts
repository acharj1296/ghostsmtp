import { BaseRepository } from './base.repository';
import { UserModel, IUser } from '../models/user.model';

export class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(UserModel);
  }

  async findByFirebaseUid(firebaseUid: string): Promise<IUser | null> {
    return this.findOne({ firebaseUid });
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.findOne({ email: email.toLowerCase() });
  }
}
