import type { RefreshTokenSession } from '../entities/RefreshTokenSession.js';
import type { TokenFamilyId, TokenHash, UserId } from '../value-objects/Identifiers.js';

export interface IRefreshTokenRepository {
  findByTokenHash(tokenHash: TokenHash): Promise<RefreshTokenSession | null>;
  save(session: RefreshTokenSession): Promise<void>;
  revokeFamily(familyId: TokenFamilyId, revokedAt: Date): Promise<number>;
  revokeAllForUser(userId: UserId, revokedAt: Date): Promise<number>;
}

