import type { TokenFamilyId, UserId, UserRole } from './Identifiers.js';

export interface AccessTokenClaims {
  readonly sub: UserId;
  readonly email: string;
  readonly roles: ReadonlyArray<UserRole>;
  readonly familyId: TokenFamilyId;
  readonly iat: number;
  readonly exp: number;
  readonly iss: string;
  readonly aud: string;
}

