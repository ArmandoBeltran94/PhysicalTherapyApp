import type { IRefreshTokenRepository } from '../../domain/ports/IRefreshTokenRepository.js';
import type { ISecurityAuditLogger } from '../../domain/ports/ISecurityAuditLogger.js';
import type { UserId } from '../../domain/value-objects/Identifiers.js';
import { Result, ok } from '../../domain/common/Result.js';

export interface RevokeAllSessionsInputDTO {
  readonly userId: UserId;
}

export interface RevokeAllSessionsOutputDTO {
  readonly revokedSessionsCount: number;
}

export class RevokeAllSessionsUseCase {
  constructor(
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly auditLogger?: ISecurityAuditLogger
  ) {}

  public async execute(input: RevokeAllSessionsInputDTO): Promise<Result<RevokeAllSessionsOutputDTO, never>> {
    const now = new Date();
    const count = await this.refreshTokenRepository.revokeAllForUser(input.userId, now);

    if (this.auditLogger) {
      await this.auditLogger.log({
        action: 'REVOKE_ALL',
        actorId: input.userId,
        details: { revokedCount: count },
        timestamp: now
      });
    }

    return ok({ revokedSessionsCount: count });
  }
}

