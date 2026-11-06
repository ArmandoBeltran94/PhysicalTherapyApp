import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes } from 'node:crypto';
import type { ITokenService, TokenPairGenerationResult } from '../../domain/ports/ITokenService.js';
import type { AccessTokenClaims } from '../../domain/value-objects/AccessTokenClaims.js';
import { createTokenHash, createTokenFamilyId, createUserId, type TokenHash, type UserRole } from '../../domain/value-objects/Identifiers.js';

export interface JoseTokenServiceConfig {
  readonly secretKey: string;
  readonly issuer?: string;
  readonly audience?: string;
  readonly accessTokenExpiresInSeconds?: number;
}

export class JoseTokenService implements ITokenService {
  private readonly secretKeyUint8: Uint8Array;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly accessTokenExpiresInSeconds: number;

  constructor(config: JoseTokenServiceConfig) {
    this.secretKeyUint8 = new TextEncoder().encode(config.secretKey);
    this.issuer = config.issuer ?? 'physical-therapy-app';
    this.audience = config.audience ?? 'physical-therapy-api';
    this.accessTokenExpiresInSeconds = config.accessTokenExpiresInSeconds ?? 900; // 15 minutos
  }

  public async generateTokenPair(
    claims: Omit<AccessTokenClaims, 'iat' | 'exp' | 'iss' | 'aud'>
  ): Promise<TokenPairGenerationResult> {
    const nowEpochSeconds = Math.floor(Date.now() / 1000);
    const expEpochSeconds = nowEpochSeconds + this.accessTokenExpiresInSeconds;

    const accessToken = await new SignJWT({
      email: claims.email,
      roles: claims.roles,
      familyId: claims.familyId
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(claims.sub)
      .setIssuedAt(nowEpochSeconds)
      .setExpirationTime(expEpochSeconds)
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .sign(this.secretKeyUint8);

    const rawRefreshToken = randomBytes(32).toString('hex');
    const refreshTokenHash = this.hashRefreshToken(rawRefreshToken);

    return {
      accessToken,
      rawRefreshToken,
      refreshTokenHash,
      expiresIn: this.accessTokenExpiresInSeconds
    };
  }

  public async verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.secretKeyUint8, {
        issuer: this.issuer,
        audience: this.audience
      });

      if (!payload.sub || typeof payload.sub !== 'string') {
        return null;
      }

      return {
        sub: createUserId(payload.sub),
        email: typeof payload['email'] === 'string' ? payload['email'] : '',
        roles: Array.isArray(payload['roles']) ? (payload['roles'] as ReadonlyArray<UserRole>) : [],
        familyId: createTokenFamilyId(typeof payload['familyId'] === 'string' ? payload['familyId'] : ''),
        iat: payload.iat ?? 0,
        exp: payload.exp ?? 0,
        iss: typeof payload.iss === 'string' ? payload.iss : this.issuer,
        aud: typeof payload.aud === 'string' ? payload.aud : this.audience
      };
    } catch {
      return null;
    }
  }

  public hashRefreshToken(rawToken: string): TokenHash {
    const hash = createHash('sha256').update(rawToken).digest('hex');
    return createTokenHash(hash);
  }
}

