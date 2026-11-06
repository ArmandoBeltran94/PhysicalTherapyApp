# Feature Specification: Autenticación con Tokens de Acceso y Renovación (JWT & Refresh Tokens)

**Feature Branch**: `001-auth-jwt-refresh`

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "Crea un módulo de autenticación con JWT y refresh tokens."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inicio de Sesión y Emisión Segura de Credenciales (Priority: P1)

Como usuario del sistema (paciente, terapeuta o administrador), deseo ingresar mis credenciales de acceso para autenticarme de forma segura y recibir credenciales de sesión que me permitan interactuar con los servicios autorizados.

**Why this priority**: Es el flujo fundamental y habilitador para cualquier interacción en el sistema. Sin autenticación primaria, ningún servicio protegido puede ser consumido.

**Independent Test**: Puede probarse de manera totalmente independiente proporcionando credenciales válidas y verificando la obtención de un token de acceso y un token de renovación que permiten acceder a recursos protegidos.

**Acceptance Scenarios**:

1. **Given** un usuario registrado con credenciales válidas, **When** solicita iniciar sesión enviando su correo y contraseña, **Then** el sistema autentica la identidad, genera un token de acceso de corta duración junto con un token de renovación, y otorga acceso al sistema.
2. **Given** un intento de acceso con credenciales incorrectas o usuario inexistente, **When** se solicita el inicio de sesión, **Then** el sistema rechaza la solicitud con un mensaje de error genérico de autenticación y no emite tokens.
3. **Given** una cuenta de usuario que acumula 5 intentos fallidos consecutivos, **When** se recibe un nuevo intento de autenticación, **Then** el sistema bloquea temporalmente las solicitudes para dicha cuenta o aplica restricción de tasa (rate limiting).

---

### User Story 2 - Renovación Transparente de Sesión Activa (Priority: P2)

Como usuario activo en el sistema, deseo que mi sesión se renueve de forma automática y transparente cuando mi credencial de acceso temporal expire, sin interrumpir mis tareas ni solicitarme ingresar nuevamente la contraseña.

**Why this priority**: Asegura una experiencia de usuario fluida y sin fricción a la vez que mantiene una ventana de exposición mínima para las credenciales de acceso.

**Independent Test**: Puede probarse enviando un token de acceso expirado acompañado de un token de renovación válido, verificando que el sistema entrega un nuevo token de acceso y un token de renovación actualizado.

**Acceptance Scenarios**:

1. **Given** un token de acceso expirado y un token de renovación válido y vigente, **When** se solicita la renovación de la sesión, **Then** el sistema valida el token de renovación, emite un nuevo token de acceso, genera un nuevo token de renovación rotado, y mantiene la sesión continua.
2. **Given** un token de renovación expirado, revocado o inválido, **When** se solicita la renovación de sesión, **Then** el sistema rechaza la solicitud y redirige al usuario a iniciar sesión nuevamente.

---

### User Story 3 - Detección de Reúso de Token y Revocación Preventiva de Sesiones (Priority: P3)

Como responsable de seguridad del sistema, deseo que el sistema detecte inmediatamente si un token de renovación ya consumido intenta utilizarse de nuevo, revocando de forma preventiva todas las sesiones de esa familia para proteger al usuario de robos de credenciales.

**Why this priority**: Proporciona defensa en profundidad contra ataques de secuestro de sesión y robo de credenciales en redes inseguras mediante la técnica de rotación estricta de tokens de renovación (Refresh Token Rotation).

**Independent Test**: Puede probarse intentando reutilizar un token de renovación que ya fue reemplazado en una renovación previa, comprobando que todas las sesiones derivadas quedan invalidadas.

**Acceptance Scenarios**:

1. **Given** un token de renovación que ya fue utilizado y reemplazado en una rotación anterior, **When** se presenta dicho token para intentar renovar sesión, **Then** el sistema detecta de inmediato el reúso indebido, rechaza la operación, invalida la familia completa de tokens asociados a esa sesión y genera un registro de alerta de seguridad.

---

### User Story 4 - Cierre de Sesión Seguro y Revocación Controlada (Priority: P4)

Como usuario autenticado, deseo poder cerrar mi sesión en el dispositivo actual o cerrar todas mis sesiones activas en todos los dispositivos si sospecho de accesos no autorizados.

**Why this priority**: Permite a los usuarios y administradores mantener el control total sobre los dispositivos con sesiones activas y garantizar la finalización efectiva de accesos.

**Independent Test**: Puede probarse ejecutando un cierre de sesión y comprobando que el token de renovación queda revocado permanentemente ante cualquier intento posterior de renovación.

**Acceptance Scenarios**:

1. **Given** un usuario con sesión activa en su dispositivo, **When** ejecuta la acción de cerrar sesión, **Then** el sistema revoca el token de renovación asociado y este no puede volver a utilizarse.
2. **Given** un usuario con múltiples dispositivos conectados, **When** solicita revocar todas sus sesiones activas, **Then** el sistema invalida de forma inmediata todos los tokens de renovación asociados a su cuenta en todos los dispositivos.

---

### Edge Cases

- **Desfase de reloj (Clock Skew)**: El sistema debe tolerar un margen configurable de segundos (ej. 30 segundos) para validar expiraciones de tiempo sin rechazar prematuramente a clientes legítimos.
- **Peticiones concurrentes de renovación (múltiples pestañas)**: Cuando varias pestañas de un navegador detectan la expiración simultánea del token de acceso y envían el mismo token de renovación en una ventana breve (10-15 segundos), el sistema debe permitir una ventana de gracia para evitar falsos positivos de reúso de token.
- **Cambio de estado o baja de cuenta durante sesión activa**: Si una cuenta de usuario es desactivada, suspendida o eliminada administrativamente, cualquier intento posterior de renovación de token o validación debe ser denegado de inmediato.
- **Tokens alterados o con firma ilegible**: El sistema debe rechazar de manera inmediata cualquier token que no pase la verificación de integridad, sin exponer detalles internos de la falla criptográfica al cliente.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE validar la identidad del usuario mediante identificador único (correo electrónico) y credencial secreta (contraseña).
- **FR-002**: El sistema DEBE emitir un token de acceso criptográficamente firmado (JWT) con tiempo de vida corto y un token de renovación único (Refresh Token) con tiempo de vida extendido tras una autenticación exitosa.
- **FR-003**: El sistema DEBE validar la firma, emisor, audiencia y expiración del token de acceso en cada solicitud a recursos protegidos sin requerir consulta a la base de datos de usuarios para operaciones ordinarias.
- **FR-004**: El sistema DEBE aplicar Rotación de Tokens de Renovación (Refresh Token Rotation), invalidando el token de renovación presentado y generando uno nuevo cada vez que se renueva la sesión.
- **FR-005**: El sistema DEBE detectar intentos de reutilización de tokens de renovación ya invalidados y, ante su detección, revocar inmediatamente toda la cadena de sesiones y tokens asociados a esa familia.
- **FR-006**: El sistema DEBE permitir el cierre de sesión voluntario en el dispositivo en uso, marcando el token de renovación como revocado permanentemente.
- **FR-007**: El sistema DEBE permitir la revocación global de todas las sesiones activas de un usuario a solicitud del propio usuario o de un administrador.
- **FR-008**: El sistema DEBE verificar el estado activo de la cuenta antes de emitir nuevos tokens durante el proceso de renovación.
- **FR-009**: El sistema DEBE incorporar protección contra ataques de fuerza bruta mediante bloqueo temporal o limitación de tasa tras fallos consecutivos de autenticación.
- **FR-010**: El sistema DEBE registrar eventos de auditoría para cada acción crítica de autenticación (inicio de sesión exitoso, inicio fallido, renovación de tokens, detección de reúso anómalo y revocación de sesiones).

### Key Entities *(include if feature involves data)*

- **Credencial de Identidad / Usuario**: Representa al actor del sistema (paciente, terapeuta, administrador), con identificador único, correo electrónico verificado, estado de la cuenta (activo, suspendido, bloqueado) y roles de acceso asignados.
- **Registro de Sesión y Token de Renovación**: Representa una sesión activa emitida para un dispositivo o cliente, conteniendo identificador de sesión, hash seguro del token de renovación, identificador de familia de tokens, fecha de emisión, fecha de expiración, estado de revocación, fecha de revocación y metadatos básicos de contexto del cliente (ej. agente de usuario o dirección IP).
- **Registro de Auditoría de Autenticación**: Representa un evento de seguridad con marca temporal, identificador del actor, tipo de acción realizada, contexto de origen y resultado de la operación.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las sesiones activas con token de renovación válido pueden renovarse de forma continua sin requerir reingreso manual de credenciales mientras la sesión se mantenga dentro del período de validez.
- **SC-002**: El 100% de los intentos de reutilización de un token de renovación consumido son detectados y neutralizados, invalidando toda la familia de tokens en menos de 1 segundo.
- **SC-003**: El tiempo de respuesta para las operaciones de autenticación inicial y renovación de sesión es inferior a 500 milisegundos en condiciones normales de carga.
- **SC-004**: El sistema bloquea o restringe automáticamente intentos sucesivos al alcanzar 5 intentos fallidos consecutivos de inicio de sesión en una misma cuenta.
- **SC-005**: El 100% de los tokens de renovación revocados son rechazados en cualquier intento posterior de renovación de sesión.

## Assumptions

- Los tokens de acceso tienen un tiempo de expiración corto por defecto (15 minutos) para minimizar el impacto en caso de interceptación.
- Los tokens de renovación tienen un tiempo de expiración extendido por defecto (7 días) de inactividad antes de requerir un nuevo inicio de sesión con contraseña.
- Se soporta el inicio de sesión concurrente en múltiples dispositivos; cada dispositivo gestiona su propia familia independiente de tokens de renovación.
- Se contempla una ventana de gracia breve (10 a 15 segundos) para solicitudes de renovación concurrentes originadas por el mismo cliente (por ejemplo, múltiples pestañas de navegador abiertas).
- Todo el tráfico de autenticación viaja a través de canales de transporte seguros y cifrados (HTTPS / TLS).

