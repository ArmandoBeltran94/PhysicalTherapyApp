import type { IUserRepository } from '../../domain/ports/IUserRepository.js';
import type { User } from '../../domain/entities/User.js';
import type { UserId } from '../../domain/value-objects/Identifiers.js';

export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();

  public async findById(id: UserId): Promise<User | null> {
    const user = this.users.get(id);
    return user ?? null;
  }

  public async findByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase().trim();
    for (const user of this.users.values()) {
      if (user.email === normalized) {
        return user;
      }
    }
    return null;
  }

  public async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  public clear(): void {
    this.users.clear();
  }
}

