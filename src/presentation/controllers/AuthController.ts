import {
  LoginRequestSchema,
  RefreshTokenRequestSchema,
  LogoutRequestSchema
} from '../schemas/authSchemas.js';
import type { LoginUseCase } from '../../application/use-cases/LoginUseCase.js';
import type { RefreshTokenUseCase } from '../../application/use-cases/RefreshTokenUseCase.js';
import type { LogoutUseCase } from '../../application/use-cases/LogoutUseCase.js';
import type { RevokeAllSessionsUseCase } from '../../application/use-cases/RevokeAllSessionsUseCase.js';
import type { AccessTokenClaims } from '../../domain/value-objects/AccessTokenClaims.js';
import { isOk } from '../../domain/common/Result.js';

export interface HttpRequest<TBody = unknown> {
  body: TBody;
  headers?: Record<string, string | undefined> | undefined;
  ip?: string | undefined;
  user?: AccessTokenClaims | undefined;
}

export interface HttpResponse<T = unknown> {
  statusCode: number;
  body: T;
}

export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly revokeAllSessionsUseCase: RevokeAllSessionsUseCase
  ) {}

  public async login(req: HttpRequest): Promise<HttpResponse> {
    const parseResult = LoginRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      return {
        statusCode: 400,
        body: {
          code: 'VALIDATION_ERROR',
          message: 'Error de validación de campos de entrada.',
          details: parseResult.error.flatten().fieldErrors
        }
      };
    }

    const userAgent = req.headers?.['user-agent'];
    const ipAddress = req.ip;

    const result = await this.loginUseCase.execute({
      email: parseResult.data.email,
      password: parseResult.data.password,
      userAgent,
      ipAddress
    });

    if (isOk(result)) {
      return {
        statusCode: 200,
        body: result.value
      };
    }

    const error = result.error;
    switch (error.code) {
      case 'ACCOUNT_LOCKED':
        return {
          statusCode: 423,
          body: {
            code: error.code,
            message: error.message
          }
        };
      case 'ACCOUNT_SUSPENDED':
        return {
          statusCode: 403,
          body: {
            code: error.code,
            message: error.message
          }
        };
      default:
        return {
          statusCode: 401,
          body: {
            code: error.code,
            message: error.message
          }
        };
    }
  }

  public async refresh(req: HttpRequest): Promise<HttpResponse> {
    const parseResult = RefreshTokenRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      return {
        statusCode: 400,
        body: {
          code: 'VALIDATION_ERROR',
          message: 'Error de validación en refresh token.',
          details: parseResult.error.flatten().fieldErrors
        }
      };
    }

    const result = await this.refreshTokenUseCase.execute({
      refreshToken: parseResult.data.refreshToken,
      userAgent: req.headers?.['user-agent'],
      ipAddress: req.ip
    });

    if (isOk(result)) {
      return {
        statusCode: 200,
        body: result.value
      };
    }

    const error = result.error;
    if (error.code === 'TOKEN_REUSE_DETECTED') {
      return {
        statusCode: 403,
        body: {
          code: 'TOKEN_REUSE_DETECTED',
          message: error.message
        }
      };
    }

    return {
      statusCode: 401,
      body: {
        code: error.code,
        message: error.message
      }
    };
  }

  public async logout(req: HttpRequest): Promise<HttpResponse> {
    const parseResult = LogoutRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      return {
        statusCode: 400,
        body: {
          code: 'VALIDATION_ERROR',
          message: 'Error de validación en datos de cierre de sesión.'
        }
      };
    }

    await this.logoutUseCase.execute({
      refreshToken: parseResult.data.refreshToken
    });

    return {
      statusCode: 204,
      body: null
    };
  }

  public async revokeAll(req: HttpRequest): Promise<HttpResponse> {
    if (!req.user || !req.user.sub) {
      return {
        statusCode: 401,
        body: {
          code: 'UNAUTHORIZED',
          message: 'Identidad del usuario ausente en la petición.'
        }
      };
    }

    const result = await this.revokeAllSessionsUseCase.execute({
      userId: req.user.sub
    });

    if (isOk(result)) {
      return {
        statusCode: 200,
        body: result.value
      };
    }

    return {
      statusCode: 500,
      body: {
        code: 'INTERNAL_ERROR',
        message: 'Error inesperado al revocar sesiones.'
      }
    };
  }
}
