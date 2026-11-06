# Phase 0: Research & Technical Decisions

**Feature**: Autenticación con Tokens de Acceso y Renovación (JWT & Refresh Tokens)  
**Branch**: `001-auth-jwt-refresh`  
**Status**: Completed  

---

## 1. Biblioteca Criptográfica para JWT

### Decisión
Adoptar **`jose`** (v5+) como la biblioteca estándar para la generación, firma y verificación de JSON Web Tokens.

### Razón
- Cumple plenamente con el Principio II de la Constitución (TypeScript estricto y tipado de primera clase).
- Está construida nativamente sobre la API estándar Web Crypto (`crypto.subtle`), haciéndola completamente agnóstica del entorno de ejecución (Node.js ESM nativo, navegadores, Edge / Lambdas).
- No posee dependencias externas (`zero-dependency`), reduciendo la superficie de vulnerabilidades en la cadena de suministro.
- Manejo estricto de algoritmos (por defecto HMAC SHA-256 `HS256` o RSA `RS256`), mitigando vulnerabilidades históricas de bibliotecas legadas (como ataques `alg: none` o confusión de claves simétricas/asimétricas).

### Alternativas Consideradas
- **`jsonwebtoken` (Auth0)**: Es la biblioteca más veterana, pero arrastra dependencias de Node.js `crypto` legacy, requiere paquetes de tipos externos (`@types/jsonwebtoken`) propensos a desincronización, su soporte ESM nativo es deficiente y se basa en callbacks en lugar de promesas modernas.
- **Implementación manual con `node:crypto`**: Proporciona control total pero incrementa el riesgo de introducir fallos criptográficos sutiles en la validación de claims y padding Base64URL.

---

## 2. Almacenamiento Seguro y Hashing de Refresh Tokens

### Decisión
Los tokens de renovación se generarán como cadenas opacas criptográficamente seguras de 256 bits (`crypto.randomBytes(32).toString('hex')` o `crypto.getRandomValues`).  
En la base de datos o capa de persistencia **NUNCA** se almacenará el token en texto plano; se almacenará exclusivamente su resumen criptográfico **SHA-256** (`tokenHash`).

### Razón
- Si la base de datos o almacenamiento de persistencia sufriera una exfiltración o brecha de seguridad, los tokens de renovación almacenados como hashes no pueden ser utilizados por un atacante para secuestrar sesiones activas.
- El cálculo de SHA-256 es determinista y de alta velocidad (O(1)), lo que permite indexar el campo `tokenHash` para búsquedas inmediatas en cada solicitud de rotación sin la sobrecarga computacional de algoritmos lentos como bcrypt (innecesarios para tokens aleatorios de alta entropía de 256 bits).

### Alternativas Consideradas
- **Almacenar Refresh Tokens en texto plano**: Rechazado por constituir una vulnerabilidad crítica ante fugas de datos.
- **Hashear con bcrypt / Argon2**: Diseñado para contraseñas de baja entropía. Para cadenas aleatorias de 256 bits, la protección contra fuerza bruta es redundante y generaría una degradación inaceptable de latencia en cada renovación concurrente.

---

## 3. Estrategia de Rotación (RTR) y Mitigación de Condiciones de Carrera (Multi-Tab)

### Decisión
Implementar **Refresh Token Rotation (RTR)** con jerarquía de familias de tokens (`familyId`) y una **ventana de gracia de 15 segundos** para solicitudes concurrentes.

### Mecanismo
1. Cada sesión de inicio exitoso crea una nueva `familyId` única.
2. Cada renovación exitosa genera un nuevo token de renovación dentro de la misma `familyId` y marca el token anterior con:
   - `isRevoked: true`
   - `replacedByTokenHash: <hash_del_nuevo_token>`
   - `revokedAt: <timestamp>`
3. **Detección de Reúso**:
   - Si se presenta un token cuyo `isRevoked === true` fuera de la ventana de gracia, el sistema clasifica el evento como un robo de sesión.
   - De inmediato, el caso de uso ejecuta la revocación total de todos los tokens con dicho `familyId` e invalida la sesión de usuario, emitiendo una alerta de auditoría.
4. **Ventana de Gracia Concurrente**:
   - Si un cliente envía el mismo token de renovación dentro de los primeros 15 segundos tras haber sido rotado (típico cuando 2 o más pestañas del navegador se reactivan simultáneamente), el sistema retorna de manera idempotente el par de tokens emitido en la rotación previa en lugar de interpretar un ataque de reúso.

### Alternativas Consideradas
- **Tokens de Renovación sin rotación**: Vulnerable; si el refresh token es interceptado, el atacante mantiene acceso permanente durante 7 días.
- **RTR estricto sin ventana de gracia**: Provoca desconexiones intempestivas y falsas alertas de seguridad para usuarios legítimos que trabajan con múltiples pestañas abiertas.

---

## 4. Validación en las Fronteras y Contratos con Zod

### Decisión
Utilizar **`zod`** (v3+) para la validación estricta en tiempo de ejecución de todos los DTOs de entrada en la capa de presentación.

### Razón
- Cumple directamente con el Principio IV de la Constitución (Validación en Fronteras).
- Infiere tipos de TypeScript de forma automática (`z.infer<typeof schema>`), garantizando una única fuente de verdad entre validación en runtime y tipado estático.
- Sanitiza y normaliza datos (por ejemplo, `email.toLowerCase().trim()`) antes de que ingresen a los casos de uso.

### Alternativas Consideradas
- **Type Guards manuales**: Propensos a errores humanos, tediosos de mantener y difíciles de sincronizar con mensajes de error declarativos.
- **`class-validator` / `reflect-metadata`**: Requiere decoradores experimentales de TypeScript, acopla la aplicación a clases mutables y viola el principio de inmutabilidad preferente.

---

## 5. Modelado de Errores: Result Pattern

### Decisión
Implementar un tipo algebraico de datos `Result<T, E>` en la capa de dominio:
```typescript
export type Result<T, E> = 
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
```

### Razón
- Cumple estrictamente con el Principio V de la Constitución (Manejo Explícito de Errores).
- Fuerza a los consumidores de los casos de uso a comprobar y manejar los errores de negocio conocidos (`InvalidCredentialsError`, `TokenExpiredError`, `TokenReuseDetectedError`, `AccountLockedError`) en tiempo de compilación.
- Reserva las excepciones (`throw new Error()`) únicamente para fallos técnicos imprevistos o caídas catastróficas de infraestructura.

### Alternativas Consideradas
- **Lanzamiento de excepciones (`throw`) para errores de negocio**: Convierte los flujos de error en saltos invisibles no verificados por el sistema de tipos de TypeScript.

