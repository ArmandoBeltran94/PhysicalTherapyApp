import type { UserId, UserRole, UserStatus } from '../value-objects/Identifiers.js';

export interface UserProps {
  readonly id: UserId;
  readonly email: string;
  readonly passwordHash: string;
  readonly roles: ReadonlyArray<UserRole>;
  status: UserStatus;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  readonly createdAt: Date;
  updatedAt: Date;
}

const RFC_5322_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export class User {
  private props: UserProps;

  constructor(props: UserProps) {
    const normalizedEmail = props.email.toLowerCase().trim();
    User.validateEmail(normalizedEmail);
    this.props = {
      ...props,
      email: normalizedEmail
    };
  }

  public static validateEmail(email: string): void {
    if (!email || email.length > 255) {
      throw new Error('Email excede longitud máxima permitida de 255 caracteres o es vacío.');
    }
    if (!RFC_5322_EMAIL_REGEX.test(email)) {
      throw new Error(`Email no cumple con formato válido RFC 5322: ${email}`);
    }
  }

  public get id(): UserId {
    return this.props.id;
  }

  public get email(): string {
    return this.props.email;
  }

  public get passwordHash(): string {
    return this.props.passwordHash;
  }

  public get roles(): ReadonlyArray<UserRole> {
    return this.props.roles;
  }

  public get status(): UserStatus {
    return this.props.status;
  }

  public get failedLoginAttempts(): number {
    return this.props.failedLoginAttempts;
  }

  public get lockedUntil(): Date | null {
    return this.props.lockedUntil;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public isLocked(now: Date = new Date()): boolean {
    if (this.props.status === 'locked') {
      if (this.props.lockedUntil && this.props.lockedUntil.getTime() > now.getTime()) {
        return true;
      }
      // El tiempo de bloqueo expiró, auto-restaurar a active
      this.props.status = 'active';
      this.props.failedLoginAttempts = 0;
      this.props.lockedUntil = null;
      this.props.updatedAt = now;
      return false;
    }
    return false;
  }

  public recordFailedAttempt(now: Date = new Date()): void {
    this.props.failedLoginAttempts += 1;
    this.props.updatedAt = now;

    if (this.props.failedLoginAttempts >= 5) {
      this.props.status = 'locked';
      // Bloqueo estricto por 15 minutos (15 * 60 * 1000 ms)
      this.props.lockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
    }
  }

  public recordSuccessfulLogin(now: Date = new Date()): void {
    this.props.failedLoginAttempts = 0;
    this.props.lockedUntil = null;
    this.props.updatedAt = now;
  }

  public toJSON(): Readonly<UserProps> {
    return { ...this.props };
  }
}
