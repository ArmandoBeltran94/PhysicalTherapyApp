export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  compare(plainPassword: string, passwordHash: string): Promise<boolean>;
}

