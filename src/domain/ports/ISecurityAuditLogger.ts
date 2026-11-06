export interface SecurityAuditEvent {
  readonly action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'TOKEN_REFRESH' | 'TOKEN_REUSE_DETECTED' | 'LOGOUT' | 'REVOKE_ALL';
  readonly actorId?: string | undefined;
  readonly familyId?: string | undefined;
  readonly ipAddress?: string | undefined;
  readonly userAgent?: string | undefined;
  readonly details?: Record<string, unknown> | undefined;
  readonly timestamp: Date;
}

export interface ISecurityAuditLogger {
  log(event: SecurityAuditEvent): Promise<void>;
}
