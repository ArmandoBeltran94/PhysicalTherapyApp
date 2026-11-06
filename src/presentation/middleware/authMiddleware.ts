import type { ITokenService } from '../../domain/ports/ITokenService.js';
import type { AccessTokenClaims } from '../../domain/value-objects/AccessTokenClaims.js';

export interface AuthenticatedRequest {
  headers: Record<string, string | undefined>;
  user?: AccessTokenClaims;
}

export interface MiddlewareResult {
  readonly authenticated: boolean;
  readonly statusCode?: number;
  readonly error?: string;
}

export class AuthMiddleware {
  constructor(private readonly tokenService: ITokenService) {}

  public async handle(req: AuthenticatedRequest): Promise<MiddlewareResult> {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        authenticated: false,
        statusCode: 401,
        error: 'Cabecera Authorization Bearer ausente o con formato incorrecto.'
      };
    }

    const token = authHeader.substring(7).trim();
    const claims = await this.tokenService.verifyAccessToken(token);

    if (!claims) {
      return {
        authenticated: false,
        statusCode: 401,
        error: 'Token de acceso inválido, manipulado o expirado.'
      };
    }

    req.user = claims;
    return { authenticated: true };
  }
}

