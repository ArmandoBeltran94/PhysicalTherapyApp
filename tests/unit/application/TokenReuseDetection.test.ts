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

describe('TokenReuseDetection (Unit - US3)', () => {
  let userRepo: InMemoryUserRepository;
  let sessionRepo: InMemoryRefreshTokenRepository;
  let tokenService: JoseTokenService;
  let auditLogger: InMemorySecurityAuditLogger;
  let refreshUseCase: RefreshTokenUseCase;

  const rawToken1 = 'compromised-token-1-sample-string-12345678901234567890';
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

    userId = createUserId('victim-user-id');
    familyId = createTokenFamilyId('victim-family-id');

    // Sembrar usuario
    const user = new User({
      id: userId,
      email: 'victima@test.com',
      passwordHash: 'hash',
      roles: ['patient'],
      status: 'active',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await userRepo.save(user);

    // Sembrar sesión original
    const tokenHash1 = tokenService.hashRefreshToken(rawToken1);
    const session1 = new RefreshTokenSession({
      id: createSessionId('session-1'),
      userId,
      familyId,
      tokenHash: tokenHash1,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: false,
      revokedAt: null,
      replacedByTokenHash: null
    });
    await sessionRepo.save(session1);
  });

  it('debe detectar reúso cuando se presenta un token ya consumido fuera de la ventana de gracia', async () => {
    // 1. Rotación legítima
    const rotationResult = await refreshUseCase.execute({ refreshToken: rawToken1 });
    expect(isOk(rotationResult)).toBe(true);
    let newRawToken = '';
    if (isOk(rotationResult)) {
      newRawToken = rotationResult.value.refreshToken;
    }

    // 2. Modificar la fecha de revocación para simular que pasaron 60 segundos (fuera de la gracia de 15s)
    const oldHash = tokenService.hashRefreshToken(rawToken1);
    const oldSession = await sessionRepo.findByTokenHash(oldHash);
    expect(oldSession).not.toBeNull();
    // Simular que fue revocado hace 60 segundos
    (oldSession as any).props.revokedAt = new Date(Date.now() - 60 * 1000);

    // 3. Atacante intenta reutilizar el token viejo
    const reuseResult = await refreshUseCase.execute({
      refreshToken: rawToken1,
      ipAddress: '198.51.100.1',
      userAgent: 'AttackerBot/1.0'
    });

    // 4. Debe retornar error TOKEN_REUSE_DETECTED
    expect(isErr(reuseResult)).toBe(true);
    if (isErr(reuseResult)) {
      expect(reuseResult.error.code).toBe('TOKEN_REUSE_DETECTED');
    }

    // 5. Debe invalidar TODAS las sesiones de la familia (incluyendo el token legítimo nuevo)
    const newHash = tokenService.hashRefreshToken(newRawToken);
    const newSession = await sessionRepo.findByTokenHash(newHash);
    expect(newSession?.isRevoked).toBe(true);

    // 6. Debe registrar un evento de auditoría de seguridad
    const auditEvents = auditLogger.getEventsByAction('TOKEN_REUSE_DETECTED');
    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0]?.actorId).toBe('victim-user-id');
    expect(auditEvents[0]?.familyId).toBe('victim-family-id');

    // 7. Intento posterior del usuario con el nuevo token debe ser rechazado
    const subsequentResult = await refreshUseCase.execute({ refreshToken: newRawToken });
    expect(isErr(subsequentResult)).toBe(true);
  });
});

