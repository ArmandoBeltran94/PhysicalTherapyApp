declare const __brand: unique symbol;

export type Brand<T, B> = T & { readonly [__brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type TokenFamilyId = Brand<string, 'TokenFamilyId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type TokenHash = Brand<string, 'TokenHash'>;

export type UserRole = 'admin' | 'therapist' | 'patient';
export type UserStatus = 'active' | 'suspended' | 'locked';

export const createUserId = (id: string): UserId => id as UserId;
export const createTokenFamilyId = (id: string): TokenFamilyId => id as TokenFamilyId;
export const createSessionId = (id: string): SessionId => id as SessionId;
export const createTokenHash = (hash: string): TokenHash => hash as TokenHash;

