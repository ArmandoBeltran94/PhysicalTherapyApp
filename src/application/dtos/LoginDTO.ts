import type { AuthTokens } from '../../domain/value-objects/AuthTokens.js';

export interface LoginInputDTO {
  readonly email: string;
  readonly password: string;
  readonly userAgent?: string | undefined;
  readonly ipAddress?: string | undefined;
}

export type LoginOutputDTO = AuthTokens;
