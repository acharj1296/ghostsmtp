import { Model, Document, FilterQuery, UpdateQuery, Types } from 'mongoose';

export abstract class BaseRepository<T extends Document> {
  protected constructor(protected readonly model: Model<T>) {}

  async create(item: Partial<T>): Promise<T> {
    return this.model.create(item);
  }

  async findById(id: string): Promise<T | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findById(id).exec();
  }

  async findOne(filter: FilterQuery<T>): Promise<T | null> {
    return this.model.findOne(filter).exec();
  }

  async find(filter: FilterQuery<T> = {}): Promise<T[]> {
    return this.model.find(filter).exec();
  }

  async update(id: string, item: UpdateQuery<T>): Promise<T | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findByIdAndUpdate(id, item, { new: true }).exec();
  }

  async delete(id: string): Promise<T | null> {
    // Perform soft delete
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date() } as unknown as UpdateQuery<T>,
      { new: true }
    ).exec();
  }
}
