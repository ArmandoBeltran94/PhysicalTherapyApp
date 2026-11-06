import { describe, it, expect } from 'vitest';
import { User } from '../../../src/domain/entities/User.js';
import { createUserId } from '../../../src/domain/value-objects/Identifiers.js';

describe('User Entity (Unit)', () => {
  const validProps = {
    id: createUserId('user-uuid-1'),
    email: 'terapeuta@clinica.com',
    passwordHash: 'hash-password-123',
    roles: ['therapist' as const],
    status: 'active' as const,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z')
  };

  it('debe crear un usuario válido con email normalizado', () => {
    const user = new User({
      ...validProps,
      email: '  TERAPEUTA@CLINICA.COM  '
    });

    expect(user.email).toBe('terapeuta@clinica.com');
    expect(user.status).toBe('active');
    expect(user.failedLoginAttempts).toBe(0);
    expect(user.isLocked()).toBe(false);
  });

  it('debe rechazar emails que excedan 255 caracteres o violen RFC 5322', () => {
    expect(() => new User({ ...validProps, email: 'email-invalido-sin-arroba' })).toThrow(/RFC 5322/);
    expect(() => new User({ ...validProps, email: `${'a'.repeat(250)}@domain.com` })).toThrow(/255 caracteres/);
  });

  it('debe registrar intentos fallidos y bloquear la cuenta a los 5 intentos durante 15 minutos', () => {
    const baseTime = new Date('2026-11-06T12:00:00Z');
    const user = new User(validProps);

    user.recordFailedAttempt(baseTime);
    expect(user.failedLoginAttempts).toBe(1);
    expect(user.isLocked(baseTime)).toBe(false);

    user.recordFailedAttempt(baseTime);
    user.recordFailedAttempt(baseTime);
    user.recordFailedAttempt(baseTime);
    expect(user.failedLoginAttempts).toBe(4);
    expect(user.isLocked(baseTime)).toBe(false);

    // 5to intento fallido
    user.recordFailedAttempt(baseTime);
    expect(user.failedLoginAttempts).toBe(5);
    expect(user.status).toBe('locked');
    expect(user.isLocked(baseTime)).toBe(true);

    // Verificar tiempo de bloqueo = baseTime + 15 min
    const expectedLockedUntil = new Date(baseTime.getTime() + 15 * 60 * 1000);
    expect(user.lockedUntil?.toISOString()).toBe(expectedLockedUntil.toISOString());

    // Pasados 16 minutos, se auto-desbloquea
    const futureTime = new Date(baseTime.getTime() + 16 * 60 * 1000);
    expect(user.isLocked(futureTime)).toBe(false);
    expect(user.status).toBe('active');
    expect(user.failedLoginAttempts).toBe(0);
  });

  it('debe reiniciar el contador de intentos fallidos al tener un login exitoso', () => {
    const user = new User(validProps);
    user.recordFailedAttempt();
    user.recordFailedAttempt();
    expect(user.failedLoginAttempts).toBe(2);

    user.recordSuccessfulLogin();
    expect(user.failedLoginAttempts).toBe(0);
    expect(user.lockedUntil).toBeNull();
  });
});

