import type { IRefreshTokenRepository } from '../../domain/ports/IRefreshTokenRepository.js';
import type { ITokenService } from '../../domain/ports/ITokenService.js';
import type { ISecurityAuditLogger } from '../../domain/ports/ISecurityAuditLogger.js';
import { Result, ok } from '../../domain/common/Result.js';

export interface LogoutInputDTO {
  readonly refreshToken: string;
}

export class LogoutUseCase {
  constructor(
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly tokenService: ITokenService,
    private readonly auditLogger?: ISecurityAuditLogger
  ) {}

  public async execute(input: LogoutInputDTO): Promise<Result<{ readonly success: true }, never>> {
    const tokenHash = this.tokenService.hashRefreshToken(input.refreshToken);
    const session = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (session && !session.isRevoked) {
      session.revoke(new Date());
      await this.refreshTokenRepository.save(session);

      if (this.auditLogger) {
        await this.auditLogger.log({
          action: 'LOGOUT',
          actorId: session.userId,
          familyId: session.familyId,
          timestamp: new Date()
        });
      }
    }

    return ok({ success: true });
  }
}

