import { randomUUID } from 'node:crypto';
import type { IRefreshTokenRepository } from '../../domain/ports/IRefreshTokenRepository.js';
import type { IUserRepository } from '../../domain/ports/IUserRepository.js';
import type { ITokenService } from '../../domain/ports/ITokenService.js';
import type { ISecurityAuditLogger } from '../../domain/ports/ISecurityAuditLogger.js';
import type { RefreshTokenInputDTO, RefreshTokenOutputDTO } from '../dtos/RefreshTokenDTO.js';
import { Result, ok, err } from '../../domain/common/Result.js';
import {
  DomainError,
  TokenExpiredError,
  TokenInvalidError,
  TokenReuseDetectedError,
  UserNotFoundError,
  AccountSuspendedError,
  AccountLockedError
} from '../../domain/errors/DomainErrors.js';
import { RefreshTokenSession } from '../../domain/entities/RefreshTokenSession.js';
import { createSessionId } from '../../domain/value-objects/Identifiers.js';

export class RefreshTokenUseCase {
  constructor(
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly auditLogger?: ISecurityAuditLogger
  ) {}

  public async execute(input: RefreshTokenInputDTO): Promise<Result<RefreshTokenOutputDTO, DomainError>> {
    const now = new Date();
    const tokenHash = this.tokenService.hashRefreshToken(input.refreshToken);
    const session = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!session) {
      return err(new TokenInvalidError());
    }

    if (session.isExpired(now)) {
      return err(new TokenExpiredError());
    }

    // Caso de token previamente revocado
    if (session.isRevoked) {
      // 1. Verificar si está dentro de la ventana de gracia para peticiones concurrentes (15s)
      if (session.isGracePeriodActive(now, 15) && session.replacedByTokenHash) {
        const replacementSession = await this.refreshTokenRepository.findByTokenHash(session.replacedByTokenHash);
        if (replacementSession && !replacementSession.isRevoked) {
          const user = await this.userRepository.findById(session.userId);
          if (user && user.status === 'active') {
            // Re-generar un access token válido de forma idempotente para la pestaña concurrente
            const tokenPair = await this.tokenService.generateTokenPair({
              sub: user.id,
              email: user.email,
              roles: user.roles,
              familyId: session.familyId
            });

            return ok({
              accessToken: tokenPair.accessToken,
              refreshToken: input.refreshToken, // Retorna de forma idempotente
              tokenType: 'Bearer',
              expiresIn: tokenPair.expiresIn
            });
          }
        }
      }

      // 2. Fuera de la ventana de gracia: DETECCIÓN DE REÚSO DE TOKEN (Posible ataque o secuestro)
      await this.refreshTokenRepository.revokeFamily(session.familyId, now);

      if (this.auditLogger) {
        await this.auditLogger.log({
          action: 'TOKEN_REUSE_DETECTED',
          actorId: session.userId,
          familyId: session.familyId,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          details: {
            presentedTokenHash: tokenHash,
            revokedAt: session.revokedAt?.toISOString()
          },
          timestamp: now
        });
      }

      return err(new TokenReuseDetectedError(session.familyId));
    }

    // Token activo: verificar estado del usuario
    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      return err(new UserNotFoundError());
    }

    if (user.isLocked(now)) {
      return err(new AccountLockedError(user.lockedUntil ?? now));
    }

    if (user.status === 'suspended') {
      return err(new AccountSuspendedError());
    }

    // Generar nuevo par de tokens dentro de la misma familyId
    const tokenPair = await this.tokenService.generateTokenPair({
      sub: user.id,
      email: user.email,
      roles: user.roles,
      familyId: session.familyId
    });

    // Rotar sesión actual
    session.rotate(tokenPair.refreshTokenHash, now);
    await this.refreshTokenRepository.save(session);

    // Crear y persistir la nueva sesión rotada
    const newSessionId = createSessionId(randomUUID());
    const newExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días

    const newSession = new RefreshTokenSession({
      id: newSessionId,
      userId: user.id,
      familyId: session.familyId,
      tokenHash: tokenPair.refreshTokenHash,
      createdAt: now,
      expiresAt: newExpiresAt,
      isRevoked: false,
      revokedAt: null,
      replacedByTokenHash: null,
      userAgent: input.userAgent ?? session.userAgent,
      ipAddress: input.ipAddress ?? session.ipAddress
    });

    await this.refreshTokenRepository.save(newSession);

    if (this.auditLogger) {
      await this.auditLogger.log({
        action: 'TOKEN_REFRESH',
        actorId: user.id,
        familyId: session.familyId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        timestamp: now
      });
    }

    return ok({
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.rawRefreshToken,
      tokenType: 'Bearer',
      expiresIn: tokenPair.expiresIn
    });
  }
}

