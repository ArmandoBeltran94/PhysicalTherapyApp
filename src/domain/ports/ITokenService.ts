import type { AccessTokenClaims } from '../value-objects/AccessTokenClaims.js';
import type { TokenHash } from '../value-objects/Identifiers.js';

export interface TokenPairGenerationResult {
  readonly accessToken: string;
  readonly rawRefreshToken: string;
  readonly refreshTokenHash: TokenHash;
  readonly expiresIn: number;
}

export interface ITokenService {
  generateTokenPair(claims: Omit<AccessTokenClaims, 'iat' | 'exp' | 'iss' | 'aud'>): Promise<TokenPairGenerationResult>;
  verifyAccessToken(token: string): Promise<AccessTokenClaims | null>;
  hashRefreshToken(rawToken: string): TokenHash;
}

