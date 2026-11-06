import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { IPasswordHasher } from '../../domain/ports/IPasswordHasher.js';

const scryptAsync = promisify(scrypt);

export class NodePasswordHasher implements IPasswordHasher {
  private readonly keyLength = 64;

  public async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scryptAsync(password, salt, this.keyLength)) as Buffer;
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  public async compare(plainPassword: string, passwordHash: string): Promise<boolean> {
    const parts = passwordHash.split(':');
    if (parts.length !== 2) {
      return false;
    }
    const [salt, originalHash] = parts;
    if (!salt || !originalHash) {
      return false;
    }

    try {
      const derivedKey = (await scryptAsync(plainPassword, salt, this.keyLength)) as Buffer;
      const originalBuffer = Buffer.from(originalHash, 'hex');

      if (derivedKey.length !== originalBuffer.length) {
        return false;
      }

      return timingSafeEqual(derivedKey, originalBuffer);
    } catch {
      return false;
    }
  }
}

