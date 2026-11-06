import type { User } from '../entities/User.js';
import type { UserId } from '../value-objects/Identifiers.js';

export interface IUserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

