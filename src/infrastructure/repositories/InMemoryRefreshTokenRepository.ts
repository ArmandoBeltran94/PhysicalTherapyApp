import type { IRefreshTokenRepository } from '../../domain/ports/IRefreshTokenRepository.js';
import type { RefreshTokenSession } from '../../domain/entities/RefreshTokenSession.js';
import type { TokenFamilyId, TokenHash, UserId } from '../../domain/value-objects/Identifiers.js';

export class InMemoryRefreshTokenRepository implements IRefreshTokenRepository {
  private sessionsByHash: Map<string, RefreshTokenSession> = new Map();

  public async findByTokenHash(tokenHash: TokenHash): Promise<RefreshTokenSession | null> {
    const session = this.sessionsByHash.get(tokenHash);
    return session ?? null;
  }

  public async save(session: RefreshTokenSession): Promise<void> {
    this.sessionsByHash.set(session.tokenHash, session);
  }

  public async revokeFamily(familyId: TokenFamilyId, revokedAt: Date): Promise<number> {
    let count = 0;
    for (const session of this.sessionsByHash.values()) {
      if (session.familyId === familyId && !session.isRevoked) {
        session.revoke(revokedAt);
        count++;
      }
    }
    return count;
  }

  public async revokeAllForUser(userId: UserId, revokedAt: Date): Promise<number> {
    let count = 0;
    for (const session of this.sessionsByHash.values()) {
      if (session.userId === userId && !session.isRevoked) {
        session.revoke(revokedAt);
        count++;
      }
    }
    return count;
  }

  public clear(): void {
    this.sessionsByHash.clear();
  }
}

