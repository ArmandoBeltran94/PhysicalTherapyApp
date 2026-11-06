import { describe, it, expect, beforeEach } from 'vitest';
import { AuthController } from '../../../src/presentation/controllers/AuthController.js';
import { LoginUseCase } from '../../../src/application/use-cases/LoginUseCase.js';
import { RefreshTokenUseCase } from '../../../src/application/use-cases/RefreshTokenUseCase.js';
import { LogoutUseCase } from '../../../src/application/use-cases/LogoutUseCase.js';
import { RevokeAllSessionsUseCase } from '../../../src/application/use-cases/RevokeAllSessionsUseCase.js';
import { InMemoryUserRepository } from '../../../src/infrastructure/repositories/InMemoryUserRepository.js';
import { InMemoryRefreshTokenRepository } from '../../../src/infrastructure/repositories/InMemoryRefreshTokenRepository.js';
import { JoseTokenService } from '../../../src/infrastructure/crypto/JoseTokenService.js';
import { NodePasswordHasher } from '../../../src/infrastructure/crypto/NodePasswordHasher.js';
import { InMemorySecurityAuditLogger } from '../../../src/infrastructure/logging/SecurityAuditLogger.js';
import { User } from '../../../src/domain/entities/User.js';
import { createUserId } from '../../../src/domain/value-objects/Identifiers.js';

describe('AuthController (Unit - HTTP Adapters)', () => {
  let controller: AuthController;
  let userRepo: InMemoryUserRepository;
  let sessionRepo: InMemoryRefreshTokenRepository;
  let tokenService: JoseTokenService;
  let passwordHasher: NodePasswordHasher;
  let auditLogger: InMemorySecurityAuditLogger;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    sessionRepo = new InMemoryRefreshTokenRepository();
    tokenService = new JoseTokenService({ secretKey: 'secret-key-at-least-32-characters-long!' });
    passwordHasher = new NodePasswordHasher();
    auditLogger = new InMemorySecurityAuditLogger();

    const loginUseCase = new LoginUseCase(userRepo, sessionRepo, tokenService, passwordHasher);
    const refreshUseCase = new RefreshTokenUseCase(sessionRepo, userRepo, tokenService, auditLogger);
    const logoutUseCase = new LogoutUseCase(sessionRepo, tokenService, auditLogger);
    const revokeAllUseCase = new RevokeAllSessionsUseCase(sessionRepo, auditLogger);

    controller = new AuthController(loginUseCase, refreshUseCase, logoutUseCase, revokeAllUseCase);

    const hash = await passwordHasher.hash('ValidPassword123!');
    const user = new User({
      id: createUserId('ctrl-user-1'),
      email: 'terapeuta@test.com',
      passwordHash: hash,
      roles: ['therapist'],
      status: 'active',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await userRepo.save(user);

    const suspendedUser = new User({
      id: createUserId('ctrl-user-suspended'),
      email: 'suspendido@test.com',
      passwordHash: hash,
      roles: ['patient'],
      status: 'suspended',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await userRepo.save(suspendedUser);
  });

  it('login: debe retornar 200 con par de tokens para credenciales válidas', async () => {
    const res = await controller.login({
      body: { email: 'terapeuta@test.com', password: 'ValidPassword123!' }
    });

    expect(res.statusCode).toBe(200);
    expect((res.body as any).accessToken).toBeDefined();
    expect((res.body as any).refreshToken).toBeDefined();
    expect((res.body as any).tokenType).toBe('Bearer');
  });

  it('login: debe retornar 400 cuando el cuerpo no cumple con el esquema Zod', async () => {
    const res = await controller.login({
      body: { email: 'email-invalido', password: '123' }
    });

    expect(res.statusCode).toBe(400);
    expect((res.body as any).code).toBe('VALIDATION_ERROR');
  });

  it('login: debe retornar 401 para contraseña incorrecta', async () => {
    const res = await controller.login({
      body: { email: 'terapeuta@test.com', password: 'WrongPassword123!' }
    });

    expect(res.statusCode).toBe(401);
    expect((res.body as any).code).toBe('INVALID_CREDENTIALS');
  });

  it('login: debe retornar 403 cuando la cuenta está suspendida', async () => {
    const res = await controller.login({
      body: { email: 'suspendido@test.com', password: 'ValidPassword123!' }
    });

    expect(res.statusCode).toBe(403);
    expect((res.body as any).code).toBe('ACCOUNT_SUSPENDED');
  });

  it('login: debe retornar 423 cuando la cuenta está bloqueada', async () => {
    for (let i = 0; i < 5; i++) {
      await controller.login({
        body: { email: 'terapeuta@test.com', password: 'WrongPassword' }
      });
    }

    const res = await controller.login({
      body: { email: 'terapeuta@test.com', password: 'ValidPassword123!' }
    });

    expect(res.statusCode).toBe(423);
    expect((res.body as any).code).toBe('ACCOUNT_LOCKED');
  });

  it('refresh: debe rotar y retornar 200 con nuevos tokens', async () => {
    const loginRes = await controller.login({
      body: { email: 'terapeuta@test.com', password: 'ValidPassword123!' }
    });
    const refreshToken = (loginRes.body as any).refreshToken;

    const refreshRes = await controller.refresh({
      body: { refreshToken }
    });

    expect(refreshRes.statusCode).toBe(200);
    expect((refreshRes.body as any).accessToken).toBeDefined();
    expect((refreshRes.body as any).refreshToken).not.toBe(refreshToken);
  });

  it('refresh: debe retornar 400 cuando el token es muy corto o ausente', async () => {
    const res = await controller.refresh({
      body: { refreshToken: 'short' }
    });

    expect(res.statusCode).toBe(400);
    expect((res.body as any).code).toBe('VALIDATION_ERROR');
  });

  it('refresh: debe retornar 401 para token inexistente', async () => {
    const res = await controller.refresh({
      body: { refreshToken: 'non-existent-token-with-at-least-32-chars!' }
    });

    expect(res.statusCode).toBe(401);
  });

  it('logout: debe retornar 204 y revocar el token', async () => {
    const loginRes = await controller.login({
      body: { email: 'terapeuta@test.com', password: 'ValidPassword123!' }
    });
    const refreshToken = (loginRes.body as any).refreshToken;

    const logoutRes = await controller.logout({
      body: { refreshToken }
    });

    expect(logoutRes.statusCode).toBe(204);
  });

  it('logout: debe retornar 400 para cuerpo inválido', async () => {
    const logoutRes = await controller.logout({
      body: { refreshToken: 'short' }
    });

    expect(logoutRes.statusCode).toBe(400);
  });

  it('revokeAll: debe retornar 401 si falta req.user', async () => {
    const res = await controller.revokeAll({
      body: {}
    });

    expect(res.statusCode).toBe(401);
  });

  it('revokeAll: debe revocar todas las sesiones del usuario autenticado y retornar 200', async () => {
    const loginRes = await controller.login({
      body: { email: 'terapeuta@test.com', password: 'ValidPassword123!' }
    });
    const accessToken = (loginRes.body as any).accessToken;
    const claims = await tokenService.verifyAccessToken(accessToken);

    const revokeRes = await controller.revokeAll({
      body: {},
      user: claims ?? undefined
    });

    expect(revokeRes.statusCode).toBe(200);
    expect((revokeRes.body as any).revokedSessionsCount).toBe(1);
  });
});
