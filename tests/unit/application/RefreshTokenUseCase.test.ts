import { describe, it, expect, beforeEach } from 'vitest';
import { RefreshTokenUseCase } from '../../../src/application/use-cases/RefreshTokenUseCase.js';
import { InMemoryUserRepository } from '../../../src/infrastructure/repositories/InMemoryUserRepository.js';
import { InMemoryRefreshTokenRepository } from '../../../src/infrastructure/repositories/InMemoryRefreshTokenRepository.js';
import { JoseTokenService } from '../../../src/infrastructure/crypto/JoseTokenService.js';
import { InMemorySecurityAuditLogger } from '../../../src/infrastructure/logging/SecurityAuditLogger.js';
import { User } from '../../../src/domain/entities/User.js';
import { RefreshTokenSession } from '../../../src/domain/entities/RefreshTokenSession.js';
import {
  createUserId,
  createSessionId,
  createTokenFamilyId
} from '../../../src/domain/value-objects/Identifiers.js';
import { isOk, isErr } from '../../../src/domain/common/Result.js';

describe('RefreshTokenUseCase (Unit - US2)', () => {
  let userRepo: InMemoryUserRepository;
  let sessionRepo: InMemoryRefreshTokenRepository;
  let tokenService: JoseTokenService;
  let auditLogger: InMemorySecurityAuditLogger;
  let refreshUseCase: RefreshTokenUseCase;

  const rawToken = 'original-refresh-token-32-bytes-string-12345678901234567890';
  let userId: ReturnType<typeof createUserId>;
  let familyId: ReturnType<typeof createTokenFamilyId>;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    sessionRepo = new InMemoryRefreshTokenRepository();
    tokenService = new JoseTokenService({
      secretKey: 'secret-key-at-least-32-characters-long!',
      accessTokenExpiresInSeconds: 900
    });
    auditLogger = new InMemorySecurityAuditLogger();
    refreshUseCase = new RefreshTokenUseCase(sessionRepo, userRepo, tokenService, auditLogger);

    userId = createUserId('user-id-123');
    familyId = createTokenFamilyId('family-id-abc');

    // Sembrar usuario
    const user = new User({
      id: userId,
      email: 'terapeuta@test.com',
      passwordHash: 'hash',
      roles: ['therapist'],
      status: 'active',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await userRepo.save(user);

    // Sembrar sesión con el refresh token hasheado
    const tokenHash = tokenService.hashRefreshToken(rawToken);
    const session = new RefreshTokenSession({
      id: createSessionId('session-1'),
      userId,
      familyId,
      tokenHash,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: false,
      revokedAt: null,
      replacedByTokenHash: null
    });
    await sessionRepo.save(session);
  });

  it('debe rotar el refresh token y retornar nuevo par de tokens', async () => {
    const result = await refreshUseCase.execute({ refreshToken: rawToken });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.accessToken).toBeDefined();
      expect(result.value.refreshToken).not.toBe(rawToken);
      expect(result.value.tokenType).toBe('Bearer');

      // Verificar que el token original quedó revocado con puntero al nuevo
      const oldHash = tokenService.hashRefreshToken(rawToken);
      const oldSession = await sessionRepo.findByTokenHash(oldHash);
      expect(oldSession?.isRevoked).toBe(true);
      expect(oldSession?.replacedByTokenHash).toBeDefined();

      // Verificar que la nueva sesión está activa
      const newHash = tokenService.hashRefreshToken(result.value.refreshToken);
      const newSession = await sessionRepo.findByTokenHash(newHash);
      expect(newSession?.isRevoked).toBe(false);
      expect(newSession?.familyId).toBe(familyId);
    }
  });

  it('debe responder de manera idempotente durante la ventana de gracia de 15 segundos para pestañas concurrentes', async () => {
    // 1era rotación legítima
    const firstResult = await refreshUseCase.execute({ refreshToken: rawToken });
    expect(isOk(firstResult)).toBe(true);

    // Simular 2da petición concurrente con el token viejo de inmediato (< 15s)
    const concurrentResult = await refreshUseCase.execute({ refreshToken: rawToken });
    expect(isOk(concurrentResult)).toBe(true);
  });

  it('debe rechazar tokens inexistentes o con hash desconocido', async () => {
    const result = await refreshUseCase.execute({ refreshToken: 'unknown-token-never-issued-by-system-12345' });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('TOKEN_INVALID');
    }
  });

  it('debe rechazar tokens expirados en tiempo', async () => {
    const expiredRawToken = 'expired-raw-token-123456789012345678901234567890';
    const expiredHash = tokenService.hashRefreshToken(expiredRawToken);
    const expiredSession = new RefreshTokenSession({
      id: createSessionId('expired-session'),
      userId,
      familyId,
      tokenHash: expiredHash,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Expiró hace 3 días
      isRevoked: false,
      revokedAt: null,
      replacedByTokenHash: null
    });
    await sessionRepo.save(expiredSession);

    const result = await refreshUseCase.execute({ refreshToken: expiredRawToken });
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('TOKEN_EXPIRED');
    }
  });
});

