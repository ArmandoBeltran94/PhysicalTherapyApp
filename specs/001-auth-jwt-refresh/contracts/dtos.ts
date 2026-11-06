/**
 * DTOs y Contratos de Entrada/Salida para el Módulo de Autenticación
 * Rigurosamente tipados según directrices de TypeScript Estricto.
 */

export interface LoginRequestDTO {
  readonly email: string;
  readonly password: string;
}

export interface RefreshTokenRequestDTO {
  readonly refreshToken: string;
}

export interface LogoutRequestDTO {
  readonly refreshToken: string;
}

export interface AuthTokensResponseDTO {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenType: 'Bearer';
  readonly expiresIn: number;
}

export interface RevokeAllResponseDTO {
  readonly revokedSessionsCount: number;
}

export interface ErrorResponseDTO {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

