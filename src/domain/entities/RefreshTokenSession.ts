import type { SessionId, TokenFamilyId, TokenHash, UserId } from '../value-objects/Identifiers.js';

export interface RefreshTokenSessionProps {
  readonly id: SessionId;
  readonly userId: UserId;
  readonly familyId: TokenFamilyId;
  tokenHash: TokenHash;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  isRevoked: boolean;
  revokedAt: Date | null;
  replacedByTokenHash: TokenHash | null;
  readonly userAgent?: string | undefined;
  readonly ipAddress?: string | undefined;
}

export class RefreshTokenSession {
  private props: RefreshTokenSessionProps;

  constructor(props: RefreshTokenSessionProps) {
    RefreshTokenSession.validate(props);
    this.props = { ...props };
  }

  public static validate(props: RefreshTokenSessionProps): void {
    if (!props.tokenHash || props.tokenHash.length !== 64) {
      throw new Error(`TokenHash debe ser una cadena hexadecimal SHA-256 de exactamente 64 caracteres. Recibido: ${props.tokenHash}`);
    }
    if (props.expiresAt.getTime() <= props.createdAt.getTime()) {
      throw new Error('expiresAt debe ser estrictamente posterior a createdAt.');
    }
    if (props.isRevoked && !props.revokedAt) {
      throw new Error('Si isRevoked es true, revokedAt DEBE ser una fecha válida no nula.');
    }
  }

  public get id(): SessionId {
    return this.props.id;
  }

  public get userId(): UserId {
    return this.props.userId;
  }

  public get familyId(): TokenFamilyId {
    return this.props.familyId;
  }

  public get tokenHash(): TokenHash {
    return this.props.tokenHash;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get expiresAt(): Date {
    return this.props.expiresAt;
  }

  public get isRevoked(): boolean {
    return this.props.isRevoked;
  }

  public get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  public get replacedByTokenHash(): TokenHash | null {
    return this.props.replacedByTokenHash;
  }

  public get userAgent(): string | undefined {
    return this.props.userAgent;
  }

  public get ipAddress(): string | undefined {
    return this.props.ipAddress;
  }

  public isExpired(now: Date = new Date()): boolean {
    return now.getTime() >= this.props.expiresAt.getTime();
  }

  public isGracePeriodActive(now: Date = new Date(), gracePeriodSeconds = 15): boolean {
    if (!this.props.isRevoked || !this.props.revokedAt) {
      return false;
    }
    const elapsedMs = now.getTime() - this.props.revokedAt.getTime();
    return elapsedMs >= 0 && elapsedMs <= gracePeriodSeconds * 1000;
  }

  public rotate(newTokenHash: TokenHash, now: Date = new Date()): void {
    this.props.isRevoked = true;
    this.props.revokedAt = now;
    this.props.replacedByTokenHash = newTokenHash;
  }

  public revoke(now: Date = new Date()): void {
    this.props.isRevoked = true;
    this.props.revokedAt = now;
  }

  public toJSON(): Readonly<RefreshTokenSessionProps> {
    return { ...this.props };
  }
}
