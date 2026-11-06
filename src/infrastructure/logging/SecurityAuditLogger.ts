import type { ISecurityAuditLogger, SecurityAuditEvent } from '../../domain/ports/ISecurityAuditLogger.js';

export class InMemorySecurityAuditLogger implements ISecurityAuditLogger {
  public readonly events: SecurityAuditEvent[] = [];

  public async log(event: SecurityAuditEvent): Promise<void> {
    this.events.push(event);
  }

  public getEventsByAction(action: SecurityAuditEvent['action']): SecurityAuditEvent[] {
    return this.events.filter((e) => e.action === action);
  }

  public clear(): void {
    this.events.length = 0;
  }
}

