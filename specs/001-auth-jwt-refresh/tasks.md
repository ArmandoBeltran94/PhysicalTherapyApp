---
description: "Task list for JWT and Refresh Token authentication module implementation"
---

# Tasks: Autenticación con Tokens de Acceso y Renovación (JWT & Refresh Tokens)

**Input**: Design documents from `specs/001-auth-jwt-refresh/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)  
**Tests**: Incluidas según el mandato de Test-First (TDD con Vitest) ratificado en el Principio III de la Constitución del proyecto.  
**Organization**: Tareas organizadas por User Story para permitir implementación y verificación incremental e independiente.  

## Format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- **[P]**: Ejecutable en paralelo (archivos independientes, sin bloqueos de dependencias pendientes).
- **[Story]**: Etiqueta de la historia de usuario asociada (`[US1]`, `[US2]`, `[US3]`, `[US4]`).
- Rutas de archivo exactas en cada tarea.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialización del proyecto TypeScript, dependencias criptográficas y entorno de pruebas Vitest.

- [X] T001 Configure TypeScript strict compiler options in `tsconfig.json` (`strict: true`, `target: ES2022`, `module: NodeNext`, path aliases `@domain/*`, `@application/*`, `@infrastructure/*`, `@presentation/*`)
- [X] T002 [P] Configure Vitest test runner and coverage in `vitest.config.ts` (`provider: 'v8'`, reporters, path aliases)
- [X] T003 [P] Add dependencies (`jose`, `zod`) and devDependencies (`vitest`, `@vitest/coverage-v8`, `typescript`, `@types/node`) in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura transversal del dominio, tipos nominales, puertos e implementaciones base en memoria que BLOQUEAN todas las historias de usuario.

**⚠️ CRITICAL**: Ninguna historia de usuario puede implementarse hasta completar esta fase.

- [X] T004 Create algebraic `Result<T, E>` pattern in `src/domain/common/Result.ts` (`{ readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E }`)
- [X] T005 [P] Create domain branded types in `src/domain/value-objects/Identifiers.ts` (`UserId`, `TokenFamilyId`, `SessionId`, `TokenHash`, `UserRole: 'admin' | 'therapist' | 'patient'`, `UserStatus: 'active' | 'suspended' | 'locked'`)
- [X] T006 [P] Create domain errors hierarchy in `src/domain/errors/DomainErrors.ts` (`InvalidCredentialsError`, `AccountLockedError`, `AccountSuspendedError`, `TokenExpiredError`, `TokenInvalidError`, `TokenReuseDetectedError`)
- [X] T007 [P] Create token value objects in `src/domain/value-objects/AccessTokenClaims.ts` and `src/domain/value-objects/AuthTokens.ts` (`accessToken: string`, `refreshToken: string`, `tokenType: 'Bearer'`, `expiresIn: number`)
- [X] T008 [P] Define domain repository interfaces in `src/domain/ports/IUserRepository.ts` and `src/domain/ports/IRefreshTokenRepository.ts`
- [X] T009 [P] Define cryptographic token and password interfaces in `src/domain/ports/ITokenService.ts` and `src/domain/ports/IPasswordHasher.ts`
- [X] T010 Implement `JoseTokenService` using `jose` library in `src/infrastructure/crypto/JoseTokenService.ts` for signing and verifying JWT access tokens
- [X] T011 [P] Implement `NodePasswordHasher` using crypto scrypt/pbkdf2 in `src/infrastructure/crypto/NodePasswordHasher.ts`
- [X] T012 [P] Implement in-memory user repository in `src/infrastructure/repositories/InMemoryUserRepository.ts`
- [X] T013 [P] Implement in-memory refresh token repository in `src/infrastructure/repositories/InMemoryRefreshTokenRepository.ts`
- [X] T014 Write unit test for `JoseTokenService` in `tests/integration/infrastructure/JoseTokenService.test.ts`

**Checkpoint**: Base fundamental lista. La implementación de historias de usuario puede comenzar.

---

## Phase 3: User Story 1 - Inicio de Sesión y Emisión de Credenciales (Priority: P1) 🎯 MVP

**Goal**: Permitir la autenticación con email y contraseña, emisión de Access Token (15 min) y Refresh Token (256 bits), con bloqueo preventivo tras 5 intentos fallidos consecutivos.

**Independent Test**: Ejecutar `LoginUseCase` o invocar `POST /api/auth/login` con credenciales válidas y verificar la recepción de tokens válidos; verificar que 5 intentos fallidos consecutivos transicionan la cuenta a `locked` durante 15 minutos.

### Tests for User Story 1 (Test-First) ⚠️

- [X] T015 [P] [US1] Unit test for `User` entity behavior in `tests/unit/domain/User.test.ts` (validate RFC 5322 email constraint, failed attempt tracking, and 15-minute lock when `failedLoginAttempts >= 5`)
- [X] T016 [P] [US1] Unit test for `LoginUseCase` in `tests/unit/application/LoginUseCase.test.ts` (verifying success, invalid password, account lock, and token emission)

### Implementation for User Story 1

- [X] T017 [US1] Implement `User` domain entity in `src/domain/entities/User.ts` quoting constraints verbatim: `email` must conform to RFC 5322 and not exceed 255 chars; if `failedLoginAttempts` reaches 5, `status` transitions to `'locked'` and `lockedUntil` is set to `Date.now() + 15 minutes`
- [X] T018 [P] [US1] Implement login DTOs in `src/application/dtos/LoginDTO.ts` (`LoginInputDTO`, `LoginOutputDTO`)
- [X] T019 [US1] Implement `LoginUseCase` in `src/application/use-cases/LoginUseCase.ts` (verifies credentials, manages failed attempts, generates initial session with SHA-256 hashed refresh token in new `familyId`, returns `Result<AuthTokens, DomainError>`)
- [X] T020 [P] [US1] Implement Zod validation schema for login in `src/presentation/schemas/authSchemas.ts` (validates `email` format and `password` minLength 8)
- [X] T021 [US1] Implement HTTP login handler in `src/presentation/controllers/AuthController.ts` handling `POST /api/auth/login` per [contracts/auth-api.json](./contracts/auth-api.json)

**Checkpoint**: User Story 1 completamente funcional y verificable como MVP independiente.

---

## Phase 4: User Story 2 - Renovación Transparente de Sesión Activa (Priority: P2)

**Goal**: Permitir la renovación continua de sesiones mediante Refresh Token Rotation (RTR), emitiendo nuevos tokens e invalidando el anterior con ventana de gracia de 15 segundos para peticiones concurrentes legítimas.

**Independent Test**: Ejecutar `RefreshTokenUseCase` o `POST /api/auth/refresh` enviando un refresh token válido y verificar la rotación; comprobar que una segunda petición concurrente dentro de 15 segundos recibe los mismos tokens sin error.

### Tests for User Story 2 (Test-First) ⚠️

- [X] T022 [P] [US2] Unit test for `RefreshTokenSession` entity in `tests/unit/domain/RefreshTokenSession.test.ts` (verifying `tokenHash` 64-char hex SHA-256 constraint, `expiresAt` 7 days constraint, rotation state transitions)
- [X] T023 [P] [US2] Unit test for `RefreshTokenUseCase` rotation in `tests/unit/application/RefreshTokenUseCase.test.ts` (testing normal rotation and concurrent request grace period within 15 seconds)

### Implementation for User Story 2

- [X] T024 [US2] Implement `RefreshTokenSession` domain entity in `src/domain/entities/RefreshTokenSession.ts` quoting constraints verbatim: `tokenHash` must be 64-character hex string; `expiresAt` must be greater than `createdAt`; if `isRevoked` is true, `revokedAt` must be a valid `Date`
- [X] T025 [P] [US2] Implement refresh token DTOs in `src/application/dtos/RefreshTokenDTO.ts`
- [X] T026 [US2] Implement `RefreshTokenUseCase` in `src/application/use-cases/RefreshTokenUseCase.ts` (validates refresh token hash, rotates token within `familyId`, marks previous token with `replacedByTokenHash`, and supports 15-second grace window)
- [X] T027 [P] [US2] Implement Zod refresh token schema in `src/presentation/schemas/authSchemas.ts` (validates `refreshToken` minLength 32)
- [X] T028 [US2] Implement HTTP refresh handler in `src/presentation/controllers/AuthController.ts` handling `POST /api/auth/refresh` per [contracts/auth-api.json](./contracts/auth-api.json)

**Checkpoint**: User Stories 1 y 2 operan de manera conjunta e independiente.

---

## Phase 5: User Story 3 - Detección de Reúso de Token y Revocación Preventiva (Priority: P3)

**Goal**: Detectar de forma inmediata cualquier intento de reutilización de un refresh token previamente consumido fuera de la ventana de gracia, revocando toda la familia de tokens (`familyId`) de la sesión para prevenir el secuestro de credenciales.

**Independent Test**: Presentar a `RefreshTokenUseCase` un refresh token ya rotado (fuera de la ventana de 15s); verificar que se dispara `TokenReuseDetectedError`, se invalidan todos los tokens con dicho `familyId` y se emite alerta de seguridad.

### Tests for User Story 3 (Test-First) ⚠️

- [X] T029 [P] [US3] Unit test for token reuse detection in `tests/unit/application/TokenReuseDetection.test.ts` (simulating reuse of already-rotated token and verifying complete family invalidation)

### Implementation for User Story 3

- [X] T030 [US3] Extend `RefreshTokenUseCase` in `src/application/use-cases/RefreshTokenUseCase.ts` with reuse detection logic and batch invalidation of all sessions matching `familyId` via `IRefreshTokenRepository.revokeFamily`
- [X] T031 [US3] Add security audit alert logging in `src/infrastructure/logging/SecurityAuditLogger.ts` when token reuse is detected
- [X] T032 [US3] Map `TokenReuseDetectedError` to HTTP 403 Forbidden with error code `TOKEN_REUSE_DETECTED` in `src/presentation/controllers/AuthController.ts`

**Checkpoint**: Mecanismo de defensa en profundidad contra secuestro de tokens completamente operativo.

---

## Phase 6: User Story 4 - Cierre de Sesión Seguro y Revocación Controlada (Priority: P4)

**Goal**: Permitir al usuario cerrar sesión en el dispositivo actual (invalidando su refresh token) o revocar globalmente todas sus sesiones activas en todos los dispositivos.

**Independent Test**: Invocar `LogoutUseCase` con un refresh token y comprobar que intentos posteriores retornan token revocado; invocar `RevokeAllSessionsUseCase` y verificar la invalidación masiva para el usuario.

### Tests for User Story 4 (Test-First) ⚠️

- [X] T033 [P] [US4] Unit test for `LogoutUseCase` and `RevokeAllSessionsUseCase` in `tests/unit/application/LogoutUseCases.test.ts`
- [X] T034 [P] [US4] Unit test for `authMiddleware` in `tests/unit/presentation/authMiddleware.test.ts` (testing Bearer JWT validation and claims extraction)

### Implementation for User Story 4

- [X] T035 [P] [US4] Implement `LogoutUseCase` in `src/application/use-cases/LogoutUseCase.ts` (marks specific refresh token session as revoked)
- [X] T036 [P] [US4] Implement `RevokeAllSessionsUseCase` in `src/application/use-cases/RevokeAllSessionsUseCase.ts` (invokes `IRefreshTokenRepository.revokeAllForUser`)
- [X] T037 [US4] Implement `authMiddleware` in `src/presentation/middleware/authMiddleware.ts` to verify Bearer JWT access tokens and inject `req.user` claims
- [X] T038 [US4] Implement HTTP handlers for `POST /api/auth/logout` and `POST /api/auth/revoke-all` in `src/presentation/controllers/AuthController.ts`

**Checkpoint**: Control de ciclo de vida de sesiones y cierre voluntario finalizado.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verificación end-to-end, validación de Quality Gates y documentación final.

- [X] T039 [P] Create comprehensive end-to-end integration test in `tests/integration/AuthFlow.test.ts` covering full lifecycle (login -> access protected route -> refresh -> reuse detection -> logout)
- [X] T040 Run typecheck verification with `tsc --noEmit` to ensure 0 type errors across all files
- [X] T041 Run full Vitest suite with coverage (`npx vitest run --coverage`) ensuring >= 90% domain coverage and >= 85% application coverage
- [X] T042 Run quickstart validation scenarios defined in `specs/001-auth-jwt-refresh/quickstart.md`
- [X] T043 [P] Update API documentation in `specs/001-auth-jwt-refresh/contracts/auth-api.json` with final verified examples

---

## Dependencies & Execution Order

### Phase Dependencies

```
┌─────────────────────────────────┐
│       Phase 1: Setup            │ (T001-T003)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     Phase 2: Foundational       │ (T004-T014) [BLOQUEA Historias de Usuario]
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   Phase 3: User Story 1 (P1)    │ (T015-T021) 🎯 MVP
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   Phase 4: User Story 2 (P2)    │ (T022-T028)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   Phase 5: User Story 3 (P3)    │ (T029-T032)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   Phase 6: User Story 4 (P4)    │ (T033-T038)
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   Phase 7: Polish & Gates       │ (T039-T043)
└─────────────────────────────────┘
```

### User Story Dependencies

- **User Story 1 (P1)**: Depende únicamente de la Fase 2 (Foundational). Constituye el MVP autónomo.
- **User Story 2 (P2)**: Depende de la Fase 2; reutiliza los puertos de repositorio y tokens generados en US1.
- **User Story 3 (P3)**: Depende de US2 (extiende el flujo de rotación para detectar anomalías de reúso).
- **User Story 4 (P4)**: Depende de la Fase 2 y US1 (para verificar sesiones activas a revocar).

### Parallel Opportunities

- **Setup (Fase 1)**: T002 y T003 pueden ejecutarse en paralelo con T001.
- **Foundational (Fase 2)**: T005, T006, T007, T008, T009 pueden ejecutarse en paralelo una vez creado `Result.ts` (T004). T011, T012, T013 pueden ejecutarse en paralelo.
- **Historias de Usuario (Fases 3-6)**:
  - Todas las tareas de pruebas (`tests/`) pueden desarrollarse en paralelo con las tareas de definición de DTOs y esquemas Zod.
  - Una vez implementada la Fase 2, desarrolladores independientes pueden asumir US1 y US4 en paralelo.

---

## Parallel Example: User Story 1

```bash
# Lanzar en paralelo las pruebas iniciales de US1 (Test-First):
Task: "T015 [P] [US1] Unit test for User entity in tests/unit/domain/User.test.ts"
Task: "T016 [P] [US1] Unit test for LoginUseCase in tests/unit/application/LoginUseCase.test.ts"

# Crear en paralelo DTOs y Esquemas Zod:
Task: "T018 [P] [US1] Implement login DTOs in src/application/dtos/LoginDTO.ts"
Task: "T020 [P] [US1] Implement Zod validation schema for login in src/presentation/schemas/authSchemas.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar **Phase 1: Setup** (T001-T003).
2. Completar **Phase 2: Foundational** (T004-T014).
3. Completar **Phase 3: User Story 1** (T015-T021).
4. **Validación y Stop**: Ejecutar pruebas unitarias de login (`npm run test tests/unit/application/LoginUseCase.test.ts`).
5. El sistema ya cuenta con autenticación segura y emisión de tokens operativa.

### Entrega Incremental

1. **Incremento 1**: Foundation + US1 (MVP de autenticación básica y control de intentos fallidos).
2. **Incremento 2**: Añadir US2 (Rotación continua RTR de tokens de renovación sin desconexión).
3. **Incremento 3**: Añadir US3 (Detección de fraude y anulación de familias de tokens comprometidas).
4. **Incremento 4**: Añadir US4 (Middleware de protección Bearer y revocación individual o global de sesiones).
5. **Incremento 5**: Polish y verificación total de Quality Gates estipulados en la Constitución.
