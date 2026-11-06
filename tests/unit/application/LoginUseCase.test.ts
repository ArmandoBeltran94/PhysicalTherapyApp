import { describe, it, expect, beforeEach } from 'vitest';
import { LoginUseCase } from '../../../src/application/use-cases/LoginUseCase.js';
import { InMemoryUserRepository } from '../../../src/infrastructure/repositories/InMemoryUserRepository.js';
import { InMemoryRefreshTokenRepository } from '../../../src/infrastructure/repositories/InMemoryRefreshTokenRepository.js';
import { JoseTokenService } from '../../../src/infrastructure/crypto/JoseTokenService.js';
import { NodePasswordHasher } from '../../../src/infrastructure/crypto/NodePasswordHasher.js';
import { User } from '../../../src/domain/entities/User.js';
import { createUserId } from '../../../src/domain/value-objects/Identifiers.js';
import { isOk, isErr } from '../../../src/domain/common/Result.js';

describe('LoginUseCase (Unit)', () => {
  let userRepo: InMemoryUserRepository;
  let sessionRepo: InMemoryRefreshTokenRepository;
  let tokenService: JoseTokenService;
  let passwordHasher: NodePasswordHasher;
  let loginUseCase: LoginUseCase;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    sessionRepo = new InMemoryRefreshTokenRepository();
    tokenService = new JoseTokenService({
      secretKey: 'secret-key-at-least-32-characters-long!',
      accessTokenExpiresInSeconds: 900
    });
    passwordHasher = new NodePasswordHasher();

    loginUseCase = new LoginUseCase(userRepo, sessionRepo, tokenService, passwordHasher);

    // Sembrar usuario de prueba
    const passwordHash = await passwordHasher.hash('CorrectPassword123!');
    const user = new User({
      id: createUserId('test-user-id'),
      email: 'terapeuta@test.com',
      passwordHash,
      roles: ['therapist'],
      status: 'active',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await userRepo.save(user);
  });

  it('debe autenticar exitosamente y retornar par de tokens válidos', async () => {
    const result = await loginUseCase.execute({
      email: 'terapeuta@test.com',
      password: 'CorrectPassword123!',
      userAgent: 'Mozilla/5.0',
      ipAddress: '127.0.0.1'
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.accessToken).toBeDefined();
      expect(result.value.refreshToken).toBeDefined();
      expect(result.value.tokenType).toBe('Bearer');
      expect(result.value.expiresIn).toBe(900);

      // Verificar que el refresh token se persistió hasheado
      const tokenHash = tokenService.hashRefreshToken(result.value.refreshToken);
      const session = await sessionRepo.findByTokenHash(tokenHash);
      expect(session).not.toBeNull();
      expect(session?.userId).toBe('test-user-id');
      expect(session?.isRevoked).toBe(false);
    }
  });

  it('debe rechazar contraseña incorrecta con InvalidCredentialsError y aumentar intentos fallidos', async () => {
    const result = await loginUseCase.execute({
      email: 'terapeuta@test.com',
      password: 'WrongPassword'
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('INVALID_CREDENTIALS');
    }

    const user = await userRepo.findByEmail('terapeuta@test.com');
    expect(user?.failedLoginAttempts).toBe(1);
  });

  it('debe bloquear la cuenta con AccountLockedError tras 5 intentos fallidos consecutivos', async () => {
    for (let i = 0; i < 4; i++) {
      await loginUseCase.execute({ email: 'terapeuta@test.com', password: 'Wrong' });
    }

    // 5to intento
    const result = await loginUseCase.execute({ email: 'terapeuta@test.com', password: 'Wrong' });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('ACCOUNT_LOCKED');
    }

    // Intentos subsecuentes retornan ACCOUNT_LOCKED de inmediato
    const nextAttempt = await loginUseCase.execute({ email: 'terapeuta@test.com', password: 'CorrectPassword123!' });
    expect(isErr(nextAttempt)).toBe(true);
    if (isErr(nextAttempt)) {
      expect(nextAttempt.error.code).toBe('ACCOUNT_LOCKED');
    }
  });

  it('debe retornar error genérico cuando el usuario no existe para prevenir enumeración', async () => {
    const result = await loginUseCase.execute({
      email: 'noexiste@test.com',
      password: 'SomePassword123!'
    });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('INVALID_CREDENTIALS');
    }
  });
});

