<!--
SYNC IMPACT REPORT
==================
Version Change: [CONSTITUTION_VERSION] (Unratified draft) -> 1.0.0
Modified Principles:
  - [PRINCIPLE_1_NAME] -> I. Arquitectura Limpia y Separación de Responsabilidades
  - [PRINCIPLE_2_NAME] -> II. TypeScript Estricto y Seguridad de Tipos Absoluta
  - [PRINCIPLE_3_NAME] -> III. Pruebas Automatizadas con Vitest (Vitest-First)
  - [PRINCIPLE_4_NAME] -> IV. Contratos Explícitos y Validación en las Fronteras
  - [PRINCIPLE_5_NAME] -> V. Simplicidad, Mantenibilidad y Manejo Explícito de Errores
Added Sections:
  - Directrices Técnicas y Estándares de Arquitectura (reemplaza [SECTION_2_NAME])
  - Flujo de Calidad, Integración y Gates de Verificación (reemplaza [SECTION_3_NAME])
Removed Sections: Ninguna.
Deferred Items / TODOs: Ninguno.
-->

# PhysicalTherapyApp Constitution

## Core Principles

### I. Arquitectura Limpia y Separación de Responsabilidades
El código DEBE estructurarse siguiendo estrictamente los principios de Clean Architecture y la regla de dependencia unidireccional hacia el centro:
- **Independencia del Dominio**: El núcleo de negocio (Entidades, Objetos de Valor y Casos de Uso) DEBE permanecer completamente agnóstico de frameworks, interfaces de usuario, detalles de persistencia y bibliotecas de infraestructura.
- **Inversión de Dependencias (Puertos y Adaptadores)**: Toda comunicación hacia el exterior (bases de datos, servicios de mensajería, APIs de terceros, almacenamiento) DEBE interactuar exclusivamente a través de interfaces (puertos) declaradas en la capa de aplicación o dominio, implementadas por adaptadores en la capa de infraestructura.
- **Aislamiento de Casos de Uso**: Cada caso de uso (interactor) DEBE tener una única responsabilidad bien definida, orquestando entidades y puertos sin mezclar lógica de presentación ni detalles SQL/HTTP.
- *Razón*: Garantiza que la lógica clínica y de negocio del sistema de terapia física sea inmune a cambios tecnológicos, altamente modular y verificable de manera aislada.

### II. TypeScript Estricto y Seguridad de Tipos Absoluta
El proyecto DEBE operar bajo un régimen de tipado estricto sin concesiones:
- **Modo Estricto Mandatorio**: La configuración del compilador DEBE mantener `strict: true`, junto con `noImplicitAny: true`, `strictNullChecks: true`, `noImplicitReturns: true` y `noUncheckedIndexedAccess: true`.
- **Prohibición de `any`**: El uso de `any` (explícito o implícito) está TERMINANTEMENTE PROHIBIDO en todo el código base. Si un dato proviene de una fuente dinámica o desconocida, DEBE tiparse como `unknown` y validarse antes de su uso.
- **Tipado Fuerte y Value Objects (Branded Types)**: Los identificadores de entidades (`PatientId`, `AppointmentId`, `TherapistId`) y valores de dominio críticos (tarifas, horas de sesión, diagnósticos) DEBEN utilizar tipos nominales / branded types o clases de Value Object para evitar confusiones de parámetros primitivos.
- **Inmutabilidad Predeterminada**: Los modelos y estados DEBEN declararse con propiedades `readonly` y colecciones inmutables (`ReadonlyArray`), limitando la mutabilidad exclusivamente a puntos locales donde sea estrictamente necesario.
- **Prohibición de Type Assertions Inseguras**: Se prohíbe el uso de casts forzados (`as Type` o `as unknown as Type`) en código de producción. La transformación y validación de tipos DEBE realizarse mediante esquemas de validación en tiempo de ejecución o Type Guards deterministas.
- *Razón*: Elimina excepciones por desreferenciación en runtime (`Cannot read property of undefined`), garantiza trazabilidad de contratos y maximiza la asistencia estática del compilador.

### III. Pruebas Automatizadas con Vitest (Vitest-First)
La verificación automatizada es el pilar de confiabilidad del sistema y Vitest es el framework oficial de ejecución de pruebas:
- **Enfoque Test-First / TDD**: Toda nueva funcionalidad o caso de uso DEBE concebirse junto con sus pruebas automatizadas. El ciclo de desarrollo sigue el patrón Red-Green-Refactor: prueba que falla inicialmente, implementación mínima requerida, refactorización con preservación de cobertura.
- **Pruebas Unitarias Aisladas y Rápidas**: El dominio y los casos de uso DEBEN contar con pruebas unitarias que se ejecuten en milisegundos, empleando dobles de prueba (fakes, mocks o stubs con las utilidades de Vitest: `vi.fn()`, `vi.spyOn()`) únicamente para los puertos de infraestructura.
- **Pruebas de Integración Concretas**: Los adaptadores de infraestructura (repositorios, clientes HTTP, serializadores) DEBEN verificarse mediante pruebas de integración que validen su comportamiento contra contratos reales o instancias locales reproducibles.
- **Nomenclatura y Semántica BDD**: Las suites de prueba DEBEN organizarse con bloques legibles en lenguaje de negocio (`describe('AgendarCitaUseCase')` -> `it('debe rechazar la cita cuando el terapeuta ya tiene una sesión programada')`).
- *Razón*: Vitest provee ejecución nativa ESM ultrarrápida, retroalimentación instantánea en modo observador (watch) y soporte nativo de TypeScript sin pasos de transpilación intermedios lentos.

### IV. Contratos Explícitos y Validación en las Fronteras
Ningún dato no validado puede cruzar los límites del sistema hacia el núcleo de aplicación:
- **Validación en Fronteras de Entrada**: Toda petición externa (REST, GraphQL, formularios, webhooks o eventos) DEBE validarse sintáctica y semánticamente en la capa de presentación mediante esquemas declarativos en tiempo de ejecución antes de invocar los casos de uso.
- **Separación de DTOs y Entidades**: Los DTOs (Data Transfer Objects), ViewModels y esquemas de persistencia DEBEN estar rigurosamente separados de las entidades del dominio. Las entidades jamás se exponen directamente a clientes externos ni se acoplan a esquemas de base de datos.
- **Contratos de Salida Predecibles**: Las respuestas hacia los clientes deben respetar esquemas de respuesta estables, versionados y tipados.
- *Razón*: Protege el dominio de corrupción de estado, inyecciones de datos no saneados y divergencia de esquemas.

### V. Simplicidad, Mantenibilidad y Manejo Explícito de Errores
El diseño del software debe priorizar la claridad, la sencillez y el control deliberado de los flujos de ejecución:
- **Manejo de Errores Tipado (Result Pattern / Domain Errors)**: Los fallos de negocio previsibles (ej. `TerapeutaNoDisponibleError`, `CitaNoEncontradaError`, `HorarioInvalidoError`) DEBEN modelarse explícitamente mediante tipos de error o resultados tipados (`Result<Success, DomainError>`), reservando las excepciones (`throw`) únicamente para condiciones catastróficas o fallos irrecuperables de infraestructura.
- **YAGNI y No Sobre-Ingeniería**: No DEBEN introducirse capas de abstracción innecesarias ni patrones complejos sin una justificación de desacoplamiento tangible. Cada abstracción DEBE responder a una necesidad real del dominio o una frontera de prueba.
- **Inmutabilidad y Funciones Puras**: La lógica de cálculo clínico, asignación de citas o validación de reglas de negocio DEBE componerse preferentemente mediante funciones puras sin efectos secundarios colaterales.
- *Razón*: Minimiza la carga cognitiva del equipo, facilita la depuración y hace que los flujos de error sean tan visibles y manejables como los flujos exitosos.

## Directrices Técnicas y Estándares de Arquitectura

### 1. Estructura de Capas
El código fuente de la aplicación DEBE respetar la siguiente disposición de directorios y reglas de visibilidad:
- `domain/`: Entidades de negocio, Objetos de Valor (Value Objects), Agregados, Reglas Clínicas, Eventos de Dominio y Contratos de Puertos de Salida (interfaces de repositorios y servicios externos). Prohibido importar librerías de infraestructura o frameworks en este directorio.
- `application/`: Casos de Uso (Interactors), DTOs de entrada y salida, Puertos de Entrada, orquestación de transacciones y servicios de aplicación. Solo puede importar desde `domain/`.
- `infrastructure/`: Implementación de repositorios, adaptadores de bases de datos, clientes de APIs externas, proveedores de autenticación y servicios de sistema. Implementa los puertos declarados en `domain/` y `application/`.
- `presentation/` (o `interfaces/`): Controladores, controladores de rutas, ViewModels, serializadores y manejadores de peticiones. Depende de `application/` para ejecutar casos de uso y de `domain/` para definiciones de tipos.

### 2. Estándares de Configuración TypeScript
Todo proyecto o módulo TypeScript en la solución DEBE incluir en su `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "skipLibCheck": true
  }
}
```

### 3. Configuración y Estándares de Vitest
Las pruebas con Vitest DEBEN configurarse en `vitest.config.ts`:
- Soporte nativo para resolución de alias de ruta sincronizados con TypeScript (`@domain/*`, `@application/*`, `@infrastructure/*`, `@presentation/*`).
- Aislamiento de entorno por prueba (`threads: true` o `isolate: true`).
- Cobertura de código calculada mediante el proveedor `@vitest/coverage-v8`.
- Prohibición de dependencias circulares y mocks globales no restablecidos (`restoreMocks: true`, `clearMocks: true`).

## Flujo de Calidad, Integración y Gates de Verificación

Para garantizar el cumplimiento riguroso de esta constitución, todo cambio de código DEBE superar los siguientes filtros de verificación antes de ser fusionado:

### 1. Verification Gates en Local y CI
1. **Verificación de Tipos Estáticos**:
   `npm run typecheck` (`tsc --noEmit`) DEBE ejecutarse con 0 errores y 0 advertencias ignoradas.
2. **Análisis Estático y Calidad (Linting)**:
   `npm run lint` DEBE verificar el cumplimiento de reglas de estilo y prohibición estricta de `any`.
3. **Suite Completa de Pruebas**:
   `npm run test` (`vitest run`) DEBE concluir con el 100% de las pruebas aprobadas.
4. **Umbrales Mínimos de Cobertura de Pruebas**:
   - Capa `domain/`: Mínimo 90% de cobertura de ramas y sentencias.
   - Capa `application/`: Mínimo 85% de cobertura de ramas y sentencias.
   - Capa `infrastructure/` y `presentation/`: Mínimo 75% de cobertura en adaptadores críticos.

### 2. Política de Revisión de Código (Code Review)
- Todo Pull Request DEBE ser revisado por al menos un par técnico verificando el cumplimiento de la regla de dependencias de Clean Architecture.
- Se rechazará de forma automática cualquier PR que introduzca `any`, que viole la separación de capas (ej. importar infraestructura dentro de dominio) o que incorpore lógica de negocio sin sus correspondientes pruebas unitarias en Vitest.

## Governance

Esta constitución representa el acuerdo fundamental de ingeniería y arquitectura para PhysicalTherapyApp, rigiendo sobre cualquier decisión particular o práctica ad-hoc de desarrollo.

### Reglas de Gobernanza
1. **Supremacía Constitucional**: En caso de conflicto entre conveniencia temporal y los principios aquí descritos, prevalece la constitución. La deuda técnica deliberada requiere justificación formal documentada y plan de pago acotado.
2. **Procedimiento de Enmienda**:
   - Las propuestas de cambio a esta constitución deben enviarse vía Pull Request modificando `.specify/memory/constitution.md`.
   - Modificaciones mayores a los principios requieren consenso de los mantenedores y un registro de decisión arquitectónica (ADR).
   - Cada enmienda debe actualizar el bloque de metadatos de versión y fechas, y generar un informe de impacto (Sync Impact Report).
3. **Política de Versionado**:
   - **MAJOR**: Cambios incompatibles en principios o arquitectura (ej. eliminación o reemplazo de Clean Architecture o TypeScript estricto).
   - **MINOR**: Incorporación de nuevos principios, herramientas o secciones que expanden las directrices sin invalidar las existentes.
   - **PATCH**: Correcciones menores de texto, clarificación de términos o refinamientos sin impacto normativo.
4. **Auditoría Continua**: En cada ciclo de desarrollo y revisión asistida (Spec Kit workflows), los agentes y revisores deben contrastar el diseño y código propuesto contra los mandatos de este documento.

**Version**: 1.0.0 | **Ratified**: 2026-11-06 | **Last Amended**: 2026-11-06
