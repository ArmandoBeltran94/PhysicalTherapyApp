import { describe, it, expect, beforeEach } from 'vitest';
import { LogoutUseCase } from '../../../src/application/use-cases/LogoutUseCase.js';
import { RevokeAllSessionsUseCase } from '../../../src/application/use-cases/RevokeAllSessionsUseCase.js';
import { InMemoryRefreshTokenRepository } from '../../../src/infrastructure/repositories/InMemoryRefreshTokenRepository.js';
import { JoseTokenService } from '../../../src/infrastructure/crypto/JoseTokenService.js';
import { InMemorySecurityAuditLogger } from '../../../src/infrastructure/logging/SecurityAuditLogger.js';
import { RefreshTokenSession } from '../../../src/domain/entities/RefreshTokenSession.js';
import {
  createUserId,
  createSessionId,
  createTokenFamilyId
} from '../../../src/domain/value-objects/Identifiers.js';
import { isOk } from '../../../src/domain/common/Result.js';

describe('Logout & RevokeAllSessions Use Cases (Unit - US4)', () => {
  let sessionRepo: InMemoryRefreshTokenRepository;
  let tokenService: JoseTokenService;
  let auditLogger: InMemorySecurityAuditLogger;
  let logoutUseCase: LogoutUseCase;
  let revokeAllUseCase: RevokeAllSessionsUseCase;

  const rawToken1 = 'raw-token-device-1-123456789012345678901234567890';
  const rawToken2 = 'raw-token-device-2-123456789012345678901234567890';
  const userId = createUserId('multi-device-user-id');

  beforeEach(async () => {
    sessionRepo = new InMemoryRefreshTokenRepository();
    tokenService = new JoseTokenService({ secretKey: 'secret-key-at-least-32-characters-long!' });
    auditLogger = new InMemorySecurityAuditLogger();

    logoutUseCase = new LogoutUseCase(sessionRepo, tokenService, auditLogger);
    revokeAllUseCase = new RevokeAllSessionsUseCase(sessionRepo, auditLogger);

    // Sembrar dos sesiones para dos dispositivos del mismo usuario
    const session1 = new RefreshTokenSession({
      id: createSessionId('sess-1'),
      userId,
      familyId: createTokenFamilyId('family-dev-1'),
      tokenHash: tokenService.hashRefreshToken(rawToken1),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: false,
      revokedAt: null,
      replacedByTokenHash: null
    });

    const session2 = new RefreshTokenSession({
      id: createSessionId('sess-2'),
      userId,
      familyId: createTokenFamilyId('family-dev-2'),
      tokenHash: tokenService.hashRefreshToken(rawToken2),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isRevoked: false,
      revokedAt: null,
      replacedByTokenHash: null
    });

    await sessionRepo.save(session1);
    await sessionRepo.save(session2);
  });

  it('debe revocar la sesión individual al hacer logout', async () => {
    const result = await logoutUseCase.execute({ refreshToken: rawToken1 });
    expect(isOk(result)).toBe(true);

    const hash1 = tokenService.hashRefreshToken(rawToken1);
    const session1 = await sessionRepo.findByTokenHash(hash1);
    expect(session1?.isRevoked).toBe(true);

    // El segundo dispositivo sigue activo
    const hash2 = tokenService.hashRefreshToken(rawToken2);
    const session2 = await sessionRepo.findByTokenHash(hash2);
    expect(session2?.isRevoked).toBe(false);

    // Auditoría
    const logs = auditLogger.getEventsByAction('LOGOUT');
    expect(logs).toHaveLength(1);
    expect(logs[0]?.actorId).toBe(userId);
  });

  it('debe revocar todas las sesiones del usuario al invocar RevokeAllSessions', async () => {
    const result = await revokeAllUseCase.execute({ userId });
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.revokedSessionsCount).toBe(2);
    }

    const hash1 = tokenService.hashRefreshToken(rawToken1);
    const session1 = await sessionRepo.findByTokenHash(hash1);
    expect(session1?.isRevoked).toBe(true);

    const hash2 = tokenService.hashRefreshToken(rawToken2);
    const session2 = await sessionRepo.findByTokenHash(hash2);
    expect(session2?.isRevoked).toBe(true);

    // Auditoría
    const logs = auditLogger.getEventsByAction('REVOKE_ALL');
    expect(logs).toHaveLength(1);
  });
});

