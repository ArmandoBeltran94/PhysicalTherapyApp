import { describe, it, expect } from 'vitest';
import { RefreshTokenSession } from '../../../src/domain/entities/RefreshTokenSession.js';
import {
  createSessionId,
  createTokenFamilyId,
  createTokenHash,
  createUserId
} from '../../../src/domain/value-objects/Identifiers.js';

describe('RefreshTokenSession Entity (Unit)', () => {
  const validHash = 'a'.repeat(64); // 64 hex chars
  const validProps = {
    id: createSessionId('session-uuid-1'),
    userId: createUserId('user-uuid-1'),
    familyId: createTokenFamilyId('family-uuid-1'),
    tokenHash: createTokenHash(validHash),
    createdAt: new Date('2026-11-06T12:00:00Z'),
    expiresAt: new Date('2026-11-13T12:00:00Z'), // 7 días
    isRevoked: false,
    revokedAt: null,
    replacedByTokenHash: null
  };

  it('debe crear una sesión válida', () => {
    const session = new RefreshTokenSession(validProps);
    expect(session.id).toBe('session-uuid-1');
    expect(session.isRevoked).toBe(false);
    expect(session.isExpired(new Date('2026-11-06T13:00:00Z'))).toBe(false);
  });

  it('debe rechazar un tokenHash que no tenga exactamente 64 caracteres', () => {
    expect(
      () =>
        new RefreshTokenSession({
          ...validProps,
          tokenHash: createTokenHash('short-hash')
        })
    ).toThrow(/64 caracteres/);
  });

  it('debe rechazar si expiresAt es menor o igual a createdAt', () => {
    expect(
      () =>
        new RefreshTokenSession({
          ...validProps,
          expiresAt: new Date('2026-11-05T00:00:00Z')
        })
    ).toThrow(/estrictamente posterior/);
  });

  it('debe rotar el token y marcarlo como revocado con referencia al nuevo token', () => {
    const session = new RefreshTokenSession(validProps);
    const newHash = createTokenHash('b'.repeat(64));
    const rotationTime = new Date('2026-11-06T13:00:00Z');

    session.rotate(newHash, rotationTime);

    expect(session.isRevoked).toBe(true);
    expect(session.revokedAt?.toISOString()).toBe(rotationTime.toISOString());
    expect(session.replacedByTokenHash).toBe(newHash);
  });

  it('debe validar la ventana de gracia de 15 segundos para peticiones concurrentes', () => {
    const session = new RefreshTokenSession(validProps);
    const rotationTime = new Date('2026-11-06T13:00:00Z');
    session.rotate(createTokenHash('b'.repeat(64)), rotationTime);

    // 5 segundos después: dentro de la ventana de gracia (15s)
    const withinGrace = new Date(rotationTime.getTime() + 5 * 1000);
    expect(session.isGracePeriodActive(withinGrace, 15)).toBe(true);

    // 16 segundos después: fuera de la ventana de gracia
    const outsideGrace = new Date(rotationTime.getTime() + 16 * 1000);
    expect(session.isGracePeriodActive(outsideGrace, 15)).toBe(false);
  });
});

