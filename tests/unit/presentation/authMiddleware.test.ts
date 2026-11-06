import { describe, it, expect, beforeEach } from 'vitest';
import { AuthMiddleware } from '../../../src/presentation/middleware/authMiddleware.js';
import { JoseTokenService } from '../../../src/infrastructure/crypto/JoseTokenService.js';
import { createUserId, createTokenFamilyId } from '../../../src/domain/value-objects/Identifiers.js';

describe('AuthMiddleware (Unit - US4)', () => {
  let tokenService: JoseTokenService;
  let middleware: AuthMiddleware;

  beforeEach(() => {
    tokenService = new JoseTokenService({
      secretKey: 'secret-key-at-least-32-characters-long!',
      accessTokenExpiresInSeconds: 900
    });
    middleware = new AuthMiddleware(tokenService);
  });

  it('debe autenticar exitosamente cuando la cabecera Bearer es válida', async () => {
    const claims = {
      sub: createUserId('auth-user-1'),
      email: 'terapeuta@test.com',
      roles: ['therapist' as const],
      familyId: createTokenFamilyId('family-1')
    };

    const { accessToken } = await tokenService.generateTokenPair(claims);
    const req = {
      headers: { authorization: `Bearer ${accessToken}` }
    };

    const result = await middleware.handle(req);
    expect(result.authenticated).toBe(true);
    expect((req as any).user).toBeDefined();
    expect((req as any).user.sub).toBe('auth-user-1');
  });

  it('debe rechazar cuando falta la cabecera Authorization', async () => {
    const req = { headers: {} };
    const result = await middleware.handle(req);

    expect(result.authenticated).toBe(false);
    expect(result.statusCode).toBe(401);
  });

  it('debe rechazar cuando el token no tiene el prefijo Bearer', async () => {
    const req = { headers: { authorization: 'Basic 12345' } };
    const result = await middleware.handle(req);

    expect(result.authenticated).toBe(false);
    expect(result.statusCode).toBe(401);
  });

  it('debe rechazar tokens expirados o corruptos', async () => {
    const req = { headers: { authorization: 'Bearer invalid.token.payload' } };
    const result = await middleware.handle(req);

    expect(result.authenticated).toBe(false);
    expect(result.statusCode).toBe(401);
  });
});

