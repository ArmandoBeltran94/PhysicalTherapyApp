# Phase 1: Data Model & Domain Entities

**Feature**: Autenticación con Tokens de Acceso y Renovación (JWT & Refresh Tokens)  
**Branch**: `001-auth-jwt-refresh`  
**Status**: Completed  

---

## 1. Domain Entities & Value Objects

### 1.1 Value Objects (TypeScript Branded Types)

Siguiendo el **Principio II (TypeScript Estricto)** de la Constitución, los identificadores y tipos semánticos utilizan *branded types* para evitar confusiones primitivas:

```typescript
declare const __brand: unique symbol;
export type Brand<T, B> = T & { readonly [__brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type TokenFamilyId = Brand<string, 'TokenFamilyId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type TokenHash = Brand<string, 'TokenHash'>;

export type UserRole = 'admin' | 'therapist' | 'patient';
export type UserStatus = 'active' | 'suspended' | 'locked';
```

---

### 1.2 Entidad: `User`

Representa a la persona o cuenta autenticable en el sistema.

| Campo | Tipo | Nulable | Descripción |
|---|---|:---:|---|
| `id` | `UserId` | No | Identificador único universal (UUID v4) |
| `email` | `string` | No | Correo electrónico en formato normalizado (lowercase, trimmed) |
| `passwordHash` | `string` | No | Hash criptográfico de la contraseña del usuario |
| `roles` | `ReadonlyArray<UserRole>` | No | Lista inmutable de roles asignados |
| `status` | `UserStatus` | No | Estado operativo de la cuenta (`active`, `suspended`, `locked`) |
| `failedLoginAttempts` | `number` | No | Contador acumulado de intentos fallidos consecutivos |
| `lockedUntil` | `Date` | Sí | Marca de tiempo hasta la cual la cuenta permanece bloqueada |
| `createdAt` | `Date` | No | Fecha de creación del registro |
| `updatedAt` | `Date` | No | Fecha de última actualización |

#### Reglas de Validación de Dominio:
- `email`: Debe cumplir con la expresión regular estándar RFC 5322 y no superar 255 caracteres.
- `failedLoginAttempts`: Si el valor alcanza `5`, `status` transiciona automáticamente a `'locked'` y `lockedUntil` se establece a `Date.now() + 15 minutos`.
- `status`: Ninguna operación de autenticación o renovación puede procesarse si `status !== 'active'`.

---

### 1.3 Entidad: `RefreshTokenSession`

Representa una sesión persistida vinculada a un cliente/dispositivo específico.

| Campo | Tipo | Nulable | Descripción |
|---|---|:---:|---|
| `id` | `SessionId` | No | Identificador único de la sesión |
| `userId` | `UserId` | No | Identificador del usuario propietario |
| `familyId` | `TokenFamilyId` | No | Identificador del linaje/familia de rotación del token |
| `tokenHash` | `TokenHash` | No | Resumen criptográfico SHA-256 del refresh token emitido |
| `createdAt` | `Date` | No | Fecha de emisión original del token |
| `expiresAt` | `Date` | No | Fecha límite de validez (7 días posteriores a `createdAt`) |
| `isRevoked` | `boolean` | No | Indicador booleano de si el token fue invalidado o consumido |
| `revokedAt` | `Date` | Sí | Fecha exacta en que se marcó como revocado |
| `replacedByTokenHash` | `TokenHash` | Sí | Hash del nuevo token que reemplazó a este en la rotación |
| `userAgent` | `string` | Sí | Información de cabecera del cliente (para auditoría) |
| `ipAddress` | `string` | Sí | Dirección IP de origen (para auditoría) |

#### Reglas de Validación de Dominio:
- `tokenHash`: Cadena hexadecimal de exactamente 64 caracteres (SHA-256).
- `expiresAt`: Debe ser posterior a `createdAt`.
- Si `isRevoked` es `true`, `revokedAt` DEBE ser un objeto `Date` válido no nulo.

---

### 1.4 Objeto de Valor: `AccessTokenClaims`

Estructura de claims inmutables embebidos en el payload del JWT firmado con algoritmo `HS256` / `RS256`:

```typescript
export interface AccessTokenClaims {
  readonly sub: UserId;
  readonly email: string;
  readonly roles: ReadonlyArray<UserRole>;
  readonly familyId: TokenFamilyId;
  readonly iat: number; // Unix timestamp en segundos
  readonly exp: number; // Unix timestamp en segundos (iat + 900s)
  readonly iss: string; // Emisor ('physical-therapy-app')
  readonly aud: string; // Audiencia ('physical-therapy-api')
}
```

---

### 1.5 Objeto de Valor: `AuthTokens`

Estructura del par de credenciales devueltas tras un login o rotación exitosa:

```typescript
export interface AuthTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenType: 'Bearer';
  readonly expiresIn: number; // Duración en segundos (900)
}
```

---

## 2. Diagrama de Transición de Estados

### 2.1 Ciclo de Vida del Refresh Token (RTR)

```
        [Credenciales Válidas]
                  │
                  ▼
          ┌──────────────┐
          │    ACTIVE    │ ◄─── (Ventana de gracia de 15s concurrente)
          └──────┬───────┘
                 │
        ┌────────┴──────────────────────────┬────────────────────────┐
        │                                   │                        │
  [Rotación de Token]               [Cierre de Sesión]        [Tiempo > 7 días]
        │                                   │                        │
        ▼                                   ▼                        ▼
 ┌──────────────┐                   ┌───────────────┐        ┌───────────────┐
 │   ROTATED    │                   │    REVOKED    │        │    EXPIRED    │
 └──────┬───────┘                   └───────────────┘        └───────────────┘
        │
  [Intento de Reúso
   fuera de gracia]
        │
        ▼
 ┌───────────────────────────┐
 │ FAMILY INVALIDATED        │
 │ (Revocación total sesión) │
 └───────────────────────────┘
```

### 2.2 Ciclo de Vida de Seguridad de la Cuenta

```
       [Operación Normal]
               │
               ▼
       ┌───────────────┐
       │    ACTIVE     │ ◄─── (Transcurren 15 min de bloqueo o reset manual)
       └───────┬───────┘
               │
      [5 Intentos Fallidos
          Consecutivos]
               │
               ▼
       ┌───────────────┐
       │    LOCKED     │
       └───────────────┘
```

