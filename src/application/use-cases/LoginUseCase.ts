import { randomUUID } from 'node:crypto';
import type { IUserRepository } from '../../domain/ports/IUserRepository.js';
import type { IRefreshTokenRepository } from '../../domain/ports/IRefreshTokenRepository.js';
import type { ITokenService } from '../../domain/ports/ITokenService.js';
import type { IPasswordHasher } from '../../domain/ports/IPasswordHasher.js';
import type { LoginInputDTO, LoginOutputDTO } from '../dtos/LoginDTO.js';
import { Result, ok, err } from '../../domain/common/Result.js';
import {
  DomainError,
  InvalidCredentialsError,
  AccountLockedError,
  AccountSuspendedError
} from '../../domain/errors/DomainErrors.js';
import { RefreshTokenSession } from '../../domain/entities/RefreshTokenSession.js';
import {
  createSessionId,
  createTokenFamilyId
} from '../../domain/value-objects/Identifiers.js';

export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly tokenService: ITokenService,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  public async execute(input: LoginInputDTO): Promise<Result<LoginOutputDTO, DomainError>> {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user) {
      return err(new InvalidCredentialsError());
    }

    const now = new Date();

    if (user.isLocked(now)) {
      return err(new AccountLockedError(user.lockedUntil ?? now));
    }

    if (user.status === 'suspended') {
      return err(new AccountSuspendedError());
    }

    const isPasswordValid = await this.passwordHasher.compare(input.password, user.passwordHash);

    if (!isPasswordValid) {
      user.recordFailedAttempt(now);
      await this.userRepository.save(user);

      if (user.isLocked(now)) {
        return err(new AccountLockedError(user.lockedUntil ?? now));
      }

      return err(new InvalidCredentialsError());
    }

    user.recordSuccessfulLogin(now);
    await this.userRepository.save(user);

    const familyId = createTokenFamilyId(randomUUID());

    const tokenPair = await this.tokenService.generateTokenPair({
      sub: user.id,
      email: user.email,
      roles: user.roles,
      familyId
    });

    const sessionId = createSessionId(randomUUID());
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días

    const session = new RefreshTokenSession({
      id: sessionId,
      userId: user.id,
      familyId,
      tokenHash: tokenPair.refreshTokenHash,
      createdAt: now,
      expiresAt,
      isRevoked: false,
      revokedAt: null,
      replacedByTokenHash: null,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress
    });

    await this.refreshTokenRepository.save(session);

    return ok({
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.rawRefreshToken,
      tokenType: 'Bearer',
      expiresIn: tokenPair.expiresIn
    });
  }
}

