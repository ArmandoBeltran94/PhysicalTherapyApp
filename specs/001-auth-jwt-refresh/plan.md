# Implementation Plan: Autenticación con Tokens de Acceso y Renovación (JWT & Refresh Tokens)

**Branch**: `001-auth-jwt-refresh` | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-auth-jwt-refresh/spec.md`

## Summary

Implementar un módulo desacoplado de autenticación basado en Clean Architecture, TypeScript en modo estricto y pruebas automatizadas con Vitest. El sistema emite pares de tokens compuestos por un Access Token JWT de corta vida (15 min) firmado criptográficamente con `jose` y un Refresh Token de 256 bits almacenado mediante hash SHA-256 con política de rotación automática (Refresh Token Rotation - RTR), detección de reúso de tokens para mitigar secuestros de sesión, y ventana de gracia para concurrencia de clientes.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+ LTS (ESM nativo)

**Primary Dependencies**: `jose` (v5+ para operaciones criptográficas JWT sobre Web Crypto API), `zod` (v3+ para validación estricta en fronteras)

**Storage**: Interfaces de repositorio (`IRefreshTokenRepository`, `IUserRepository`) con adaptadores desacoplados (En memoria para pruebas y SQLite/Base de datos para producción)

**Testing**: `vitest` (v2+) con `@vitest/coverage-v8` para suites unitarias y de integración

**Target Platform**: Servidor Node.js / Linux / Contenedor

**Project Type**: Clean Architecture Backend Module / Web API

**Performance Goals**: Operaciones de login y rotación completadas en < 500ms; ejecución total de suite de pruebas unitarias en < 1000ms

**Constraints**:
- 0 uso de `any`, tipado nominal con Branded Types.
- No almacenamiento de tokens en texto plano (exclusivamente hashes SHA-256).
- Separación estricta de capas sin dependencias inversas hacia infraestructura.
- Manejo de errores de negocio mediante `Result<T, E>`.

**Scale/Scope**: Soporte de sesiones multidispositivo, rotación de tokens por familia (`familyId`), detección inmediata de reúso.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Mandato Constitucional | Estado | Evidencia en el Diseño |
|---|:---:|---|
| **I. Arquitectura Limpia** | ✅ PASA | Capas `domain/`, `application/`, `infrastructure/` y `presentation/` estrictamente delimitadas con inversión de dependencias mediante puertos. |
| **II. TypeScript Estricto** | ✅ PASA | Configuración con `strict: true`, uso de branded types (`UserId`, `TokenHash`), inmutabilidad con `readonly` y ausencia total de `any`. |
| **III. Pruebas con Vitest** | ✅ PASA | Vitest configurado con mocks y dobles de prueba aislados en memoria para verificar lógica de dominio y casos de uso en milisegundos. |
| **IV. Validación en Fronteras** | ✅ PASA | Esquemas Zod para validar payloads de entrada en `presentation/` antes de alcanzar los casos de uso. |
| **V. Simplicidad & Result Pattern** | ✅ PASA | Implementación de `Result<T, DomainError>` para control explícito de fallos sin lanzar excepciones no controladas. |

## Project Structure

### Documentation (this feature)

```text
specs/001-auth-jwt-refresh/
├── spec.md              # Feature specification
├── plan.md              # Implementation Plan (/speckit-plan output)
├── research.md          # Phase 0 research decisions
├── data-model.md        # Phase 1 data entities and state transitions
├── quickstart.md        # Phase 1 validation and runnable guide
├── contracts/           # Phase 1 API and DTO contracts
│   ├── auth-api.json    # OpenAPI 3.1 REST contract
│   └── dtos.ts          # TypeScript interfaces for requests/responses
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
src/
├── domain/
│   ├── common/
│   │   └── Result.ts                    # Tipo algebraico Result<T, E>
│   ├── value-objects/
│   │   ├── Identifiers.ts               # Branded types (UserId, TokenFamilyId, TokenHash)
│   │   ├── AccessTokenClaims.ts         # Contrato inmutable de claims JWT
│   │   └── AuthTokens.ts                # Par de tokens emitidos
│   ├── entities/
│   │   ├── User.ts                      # Entidad de usuario y reglas de bloqueo
│   │   └── RefreshTokenSession.ts       # Entidad de sesión y ciclo de vida de token
│   ├── errors/
│   │   └── DomainErrors.ts              # Errores tipados de negocio
│   └── ports/
│       ├── IUserRepository.ts           # Puerto de acceso a usuarios
│       ├── IRefreshTokenRepository.ts   # Puerto de persistencia de sesiones
│       ├── ITokenService.ts             # Puerto de generación/validación JWT
│       └── IPasswordHasher.ts           # Puerto de verificación de credenciales
│
├── application/
│   ├── dtos/
│   │   ├── LoginDTO.ts
│   │   └── RefreshTokenDTO.ts
│   └── use-cases/
│       ├── LoginUseCase.ts              # Caso de uso: Inicio de sesión (P1)
│       ├── RefreshTokenUseCase.ts       # Caso de uso: Rotación RTR y detección reúso (P2/P3)
│       ├── LogoutUseCase.ts             # Caso de uso: Cierre de sesión individual (P4)
│       └── RevokeAllSessionsUseCase.ts  # Caso de uso: Revocación global de sesiones (P4)
│
├── infrastructure/
│   ├── crypto/
│   │   ├── JoseTokenService.ts          # Implementación JWT con jose
│   │   └── NodePasswordHasher.ts        # Implementación hash de contraseñas
│   └── repositories/
│       ├── InMemoryUserRepository.ts    # Repositorio en memoria para pruebas
│       └── InMemoryRefreshTokenRepository.ts
│
└── presentation/
    ├── schemas/
    │   └── authSchemas.ts               # Esquemas Zod de validación en runtime
    ├── controllers/
    │   └── AuthController.ts            # Adaptador HTTP para los casos de uso
    └── middleware/
        └── authMiddleware.ts            # Middleware de validación de Access Token

tests/
├── unit/
│   ├── domain/
│   │   ├── User.test.ts
│   │   └── RefreshTokenSession.test.ts
│   └── application/
│       ├── LoginUseCase.test.ts
│       ├── RefreshTokenUseCase.test.ts
│       ├── LogoutUseCase.test.ts
│       └── RevokeAllSessionsUseCase.test.ts
└── integration/
    └── infrastructure/
        ├── JoseTokenService.test.ts
        └── InMemoryRefreshTokenRepository.test.ts
```

**Structure Decision**: Se adopta una arquitectura limpia modular desacoplada en `src/`, respetando rigurosamente el aislamiento del núcleo de dominio y aplicación respecto a detalles de persistencia y transporte.

## Complexity Tracking

> **No violations of the constitution detected. All gates passed without exceptions.**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| *Ninguna* | Conforme a la constitución | Todas las decisiones cumplen directamente con los principios rectores |
