import { describe, it, expect } from 'vitest';
import { JoseTokenService } from '../../../src/infrastructure/crypto/JoseTokenService.js';
import { createUserId, createTokenFamilyId } from '../../../src/domain/value-objects/Identifiers.js';

describe('JoseTokenService (Integration)', () => {
  const secretKey = 'super-secret-crypto-key-for-testing-at-least-32-bytes!';
  const tokenService = new JoseTokenService({
    secretKey,
    issuer: 'physical-therapy-app-test',
    audience: 'physical-therapy-api-test',
    accessTokenExpiresInSeconds: 60
  });

  it('debe generar un par de tokens con Access Token JWT y Refresh Token criptográfico', async () => {
    const claims = {
      sub: createUserId('user-123'),
      email: 'terapeuta@test.com',
      roles: ['therapist' as const],
      familyId: createTokenFamilyId('family-456')
    };

    const result = await tokenService.generateTokenPair(claims);

    expect(result.accessToken).toBeTypeOf('string');
    expect(result.accessToken.split('.')).toHaveLength(3);
    expect(result.rawRefreshToken).toHaveLength(64); // 32 bytes hex = 64 chars
    expect(result.refreshTokenHash).toHaveLength(64); // SHA-256 hex = 64 chars
    expect(result.expiresIn).toBe(60);
  });

  it('debe verificar y extraer claims de un Access Token válido', async () => {
    const claims = {
      sub: createUserId('user-789'),
      email: 'admin@test.com',
      roles: ['admin' as const],
      familyId: createTokenFamilyId('family-999')
    };

    const { accessToken } = await tokenService.generateTokenPair(claims);
    const verified = await tokenService.verifyAccessToken(accessToken);

    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe('user-789');
    expect(verified?.email).toBe('admin@test.com');
    expect(verified?.roles).toEqual(['admin']);
    expect(verified?.familyId).toBe('family-999');
    expect(verified?.iss).toBe('physical-therapy-app-test');
    expect(verified?.aud).toBe('physical-therapy-api-test');
  });

  it('debe rechazar tokens con firma inválida o alterada', async () => {
    const claims = {
      sub: createUserId('user-tamper'),
      email: 'tamper@test.com',
      roles: ['patient' as const],
      familyId: createTokenFamilyId('family-111')
    };

    const { accessToken } = await tokenService.generateTokenPair(claims);
    const tampered = accessToken.slice(0, -5) + 'xxxxx';

    const verified = await tokenService.verifyAccessToken(tampered);
    expect(verified).toBeNull();
  });

  it('debe calcular hash SHA-256 determinista de 64 caracteres para el refresh token', () => {
    const raw = 'random-token-sample-string-123456';
    const hash1 = tokenService.hashRefreshToken(raw);
    const hash2 = tokenService.hashRefreshToken(raw);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });
});

