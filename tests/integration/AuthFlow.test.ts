import { describe, it, expect, beforeEach } from 'vitest';
import { AuthController } from '../../src/presentation/controllers/AuthController.js';
import { AuthMiddleware } from '../../src/presentation/middleware/authMiddleware.js';
import { LoginUseCase } from '../../src/application/use-cases/LoginUseCase.js';
import { RefreshTokenUseCase } from '../../src/application/use-cases/RefreshTokenUseCase.js';
import { LogoutUseCase } from '../../src/application/use-cases/LogoutUseCase.js';
import { RevokeAllSessionsUseCase } from '../../src/application/use-cases/RevokeAllSessionsUseCase.js';
import { InMemoryUserRepository } from '../../src/infrastructure/repositories/InMemoryUserRepository.js';
import { InMemoryRefreshTokenRepository } from '../../src/infrastructure/repositories/InMemoryRefreshTokenRepository.js';
import { JoseTokenService } from '../../src/infrastructure/crypto/JoseTokenService.js';
import { NodePasswordHasher } from '../../src/infrastructure/crypto/NodePasswordHasher.js';
import { InMemorySecurityAuditLogger } from '../../src/infrastructure/logging/SecurityAuditLogger.js';
import { User } from '../../src/domain/entities/User.js';
import { createUserId } from '../../src/domain/value-objects/Identifiers.js';

describe('AuthFlow (End-to-End Integration)', () => {
  let controller: AuthController;
  let middleware: AuthMiddleware;
  let userRepo: InMemoryUserRepository;
  let sessionRepo: InMemoryRefreshTokenRepository;
  let tokenService: JoseTokenService;
  let passwordHasher: NodePasswordHasher;
  let auditLogger: InMemorySecurityAuditLogger;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    sessionRepo = new InMemoryRefreshTokenRepository();
    tokenService = new JoseTokenService({
      secretKey: 'secret-key-at-least-32-characters-long!',
      accessTokenExpiresInSeconds: 900
    });
    passwordHasher = new NodePasswordHasher();
    auditLogger = new InMemorySecurityAuditLogger();

    const loginUseCase = new LoginUseCase(userRepo, sessionRepo, tokenService, passwordHasher);
    const refreshUseCase = new RefreshTokenUseCase(sessionRepo, userRepo, tokenService, auditLogger);
    const logoutUseCase = new LogoutUseCase(sessionRepo, tokenService, auditLogger);
    const revokeAllUseCase = new RevokeAllSessionsUseCase(sessionRepo, auditLogger);

    controller = new AuthController(loginUseCase, refreshUseCase, logoutUseCase, revokeAllUseCase);
    middleware = new AuthMiddleware(tokenService);

    const hash = await passwordHasher.hash('ClinicalSecret2026!');
    const user = new User({
      id: createUserId('therapist-uuid-100'),
      email: 'doctor@terapiafisica.com',
      passwordHash: hash,
      roles: ['therapist'],
      status: 'active',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await userRepo.save(user);
  });

  it('debe ejecutar el ciclo de vida completo: Login -> Middleware -> Refresh -> Reúso de Token -> Logout', async () => {
    // 1. Login exitoso
    const loginRes = await controller.login({
      body: {
        email: 'doctor@terapiafisica.com',
        password: 'ClinicalSecret2026!'
      },
      ip: '10.0.0.1',
      headers: { 'user-agent': 'Chrome/120' }
    });

    expect(loginRes.statusCode).toBe(200);
    const { accessToken, refreshToken } = loginRes.body as any;
    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();

    // 2. Proteger endpoint con AuthMiddleware usando el Access Token
    const protectedReq = {
      headers: { authorization: `Bearer ${accessToken}` }
    };
    const authResult = await middleware.handle(protectedReq);
    expect(authResult.authenticated).toBe(true);
    expect((protectedReq as any).user.sub).toBe('therapist-uuid-100');
    expect((protectedReq as any).user.roles).toContain('therapist');

    // 3. Rotación legítima de Refresh Token (RTR)
    const refreshRes = await controller.refresh({
      body: { refreshToken }
    });
    expect(refreshRes.statusCode).toBe(200);
    const newAccessToken = (refreshRes.body as any).accessToken;
    const newRefreshToken = (refreshRes.body as any).refreshToken;
    expect(newRefreshToken).not.toBe(refreshToken);

    // 4. Intento de reúso del token viejo fuera de ventana de gracia
    // (Simulamos paso de tiempo > 15s)
    const oldHash = tokenService.hashRefreshToken(refreshToken);
    const oldSession = await sessionRepo.findByTokenHash(oldHash);
    expect(oldSession).not.toBeNull();
    (oldSession as any).props.revokedAt = new Date(Date.now() - 30 * 1000);

    const reuseRes = await controller.refresh({
      body: { refreshToken },
      ip: '192.168.1.50'
    });
    expect(reuseRes.statusCode).toBe(403);
    expect((reuseRes.body as any).code).toBe('TOKEN_REUSE_DETECTED');

    // Comprobar que el nuevo token también fue invalidado preventivamente por la alerta
    const compromisedHash = tokenService.hashRefreshToken(newRefreshToken);
    const compromisedSession = await sessionRepo.findByTokenHash(compromisedHash);
    expect(compromisedSession?.isRevoked).toBe(true);

    // 5. Cierre de sesión (Logout)
    const logoutRes = await controller.logout({
      body: { refreshToken: newRefreshToken }
    });
    expect(logoutRes.statusCode).toBe(204);
  });
});

