/**
 * Hierarquía de errores tipados de dominio para el módulo de autenticación.
 */

export abstract class DomainError extends Error {
  public abstract readonly code: string;
  public readonly timestamp: Date;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidCredentialsError extends DomainError {
  public readonly code = 'INVALID_CREDENTIALS';
  constructor(message = 'Credenciales de acceso inválidas.') {
    super(message);
  }
}

export class AccountLockedError extends DomainError {
  public readonly code = 'ACCOUNT_LOCKED';
  public readonly lockedUntil: Date;

  constructor(lockedUntil: Date, message = 'Cuenta bloqueada temporalmente por intentos fallidos.') {
    super(message);
    this.lockedUntil = lockedUntil;
  }
}

export class AccountSuspendedError extends DomainError {
  public readonly code = 'ACCOUNT_SUSPENDED';
  constructor(message = 'La cuenta de usuario se encuentra suspendida o inactiva.') {
    super(message);
  }
}

export class TokenExpiredError extends DomainError {
  public readonly code = 'TOKEN_EXPIRED';
  constructor(message = 'El token proporcionado ha expirado.') {
    super(message);
  }
}

export class TokenInvalidError extends DomainError {
  public readonly code = 'TOKEN_INVALID';
  constructor(message = 'El token proporcionado es inválido o no existe.') {
    super(message);
  }
}

export class TokenReuseDetectedError extends DomainError {
  public readonly code = 'TOKEN_REUSE_DETECTED';
  public readonly familyId: string;

  constructor(familyId: string, message = 'Se detectó intento de reutilización de token. Sesión invalidada.') {
    super(message);
    this.familyId = familyId;
  }
}

export class UserNotFoundError extends DomainError {
  public readonly code = 'USER_NOT_FOUND';
  constructor(message = 'Usuario no encontrado.') {
    super(message);
  }
}

