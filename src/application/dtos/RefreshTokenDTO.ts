import type { AuthTokens } from '../../domain/value-objects/AuthTokens.js';

export interface RefreshTokenInputDTO {
  readonly refreshToken: string;
  readonly userAgent?: string | undefined;
  readonly ipAddress?: string | undefined;
}

export type RefreshTokenOutputDTO = AuthTokens;
