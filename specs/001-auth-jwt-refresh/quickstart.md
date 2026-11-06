# Quickstart Validation Guide: Módulo de Autenticación con JWT & Refresh Tokens

**Feature**: Autenticación con Tokens de Acceso y Renovación (JWT & Refresh Tokens)  
**Branch**: `001-auth-jwt-refresh`  
**Referencia a Especificación**: [spec.md](./spec.md)  
**Referencia a Modelo de Datos**: [data-model.md](./data-model.md)  
**Referencia a Contratos API**: [auth-api.json](./contracts/auth-api.json)  

---

## 1. Requisitos Previos

- **Node.js**: v20+ LTS
- **Gestor de Paquetes**: `npm` v10+
- **Dependencias del Módulo**: `jose`, `zod`, `vitest`

---

## 2. Preparación y Configuración

```bash
# 1. Instalar dependencias de desarrollo y producción para el módulo
npm install jose zod
npm install -D vitest @vitest/coverage-v8 typescript @types/node

# 2. Verificar compilación estricta de TypeScript
npm run typecheck

# 3. Ejecutar suite de pruebas con Vitest
npm run test
```

---

## 3. Escenarios de Validación End-to-End

### Escenario 1: Inicio de Sesión Exitoso (User Story 1 - P1)
- **Acción**: Enviar `POST /api/auth/login` con credenciales válidas:
  ```json
  {
    "email": "terapeuta@terapiafisica.com",
    "password": "PasswordSeguro123!"
  }
  ```
- **Resultado Esperado**:
  - Código HTTP `200 OK`.
  - Retorna `accessToken` (JWT válido firmado con duración de 900s), `refreshToken` (cadena opaca de 256 bits), `tokenType: "Bearer"`.
  - El refresh token se almacena internamente como hash SHA-256 en estado activo.

---

### Escenario 2: Renovación de Sesión con Rotación (User Story 2 - P2)
- **Acción**: Enviar `POST /api/auth/refresh` enviando el `refreshToken` obtenido en el Escenario 1:
  ```json
  {
    "refreshToken": "<REFRESH_TOKEN_ACTUAL>"
  }
  ```
- **Resultado Esperado**:
  - Código HTTP `200 OK`.
  - Retorna un nuevo `accessToken` y un nuevo `refreshToken` rotado.
  - El token de renovación anterior queda marcado como `isRevoked: true` con referencia al nuevo token (`replacedByTokenHash`).

---

### Escenario 3: Detección de Reúso de Token y Revocación de Familia (User Story 3 - P3)
- **Acción**: Intentar reutilizar el `refreshToken` antiguo (el consumido en el Escenario 2):
  ```json
  {
    "refreshToken": "<REFRESH_TOKEN_ANTIGUO_YA_ROTADO>"
  }
  ```
- **Resultado Esperado**:
  - Código HTTP `403 Forbidden` con código de error `"TOKEN_REUSE_DETECTED"`.
  - Toda la familia de tokens asociada a la sesión (`familyId`) queda inmediatamente invalidada.
  - Cualquier intento posterior con los tokens de esa sesión es denegado.

---

### Escenario 4: Cierre de Sesión (User Story 4 - P4)
- **Acción**: Enviar `POST /api/auth/logout` con cabecera `Authorization: Bearer <ACCESS_TOKEN>` y cuerpo con `refreshToken`.
- **Resultado Esperado**:
  - Código HTTP `204 No Content`.
  - El refresh token queda revocado permanentemente. Un intento subsecuente de refresco retorna `401 Unauthorized`.

---

## 4. Comprobación de Calidad y Cobertura (Vitest)

Ejecutar el reporte de cobertura para verificar los Quality Gates estipulados en la Constitución:

```bash
npx vitest run --coverage
```

**Criterios de Aceptación de los Gates**:
- Capa `domain/`: Cobertura >= 90% (Entidades, Value Objects, Result pattern).
- Capa `application/`: Cobertura >= 85% (Casos de uso: Login, Refresh, Logout, RevokeAll).
- Tiempo total de ejecución de pruebas unitarias: < 1000 ms.

