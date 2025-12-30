# Aplicación Web de Terapia Física

Sistema completo de gestión de terapia física desarrollado con ASP.NET Core (.NET 8), Entity Framework Core, y SQL Server.

## 🚀 Características

- ✅ **Autenticación y Autorización**: Sistema completo con ASP.NET Identity
- ✅ **Gestión de Citas**: Agendar, ver y cancelar citas
- ✅ **Sistema de Pagos**: Procesamiento de pagos simulado
- ✅ **Panel de Administración**: Gestión de servicios, terapeutas y reportes
- ✅ **Roles de Usuario**: Admin, Terapeuta, Paciente
- ✅ **Diseño Moderno**: Interfaz responsive con CSS moderno
- ✅ **Base de Datos**: SQL Server con migraciones automáticas

## 📋 Requisitos Previos

Para ejecutar esta aplicación necesitas:

1. **.NET 8 SDK** - [Descargar aquí](https://dotnet.microsoft.com/download/dotnet/8.0)
2. **Visual Studio 2022** (opcional pero recomendado) o **VS Code**

**Nota:** La aplicación usa SQLite como base de datos, por lo que no necesitas instalar SQL Server.

## 🔧 Instalación

### Paso 1: Instalar .NET 8 SDK

Si no tienes .NET instalado:

```bash
# Verificar si .NET está instalado
dotnet --version

# Si no está instalado, descarga desde:
# https://dotnet.microsoft.com/download/dotnet/8.0
```

### Paso 2: Restaurar Paquetes

```bash
cd PhysicalTherapyApp
dotnet restore
```

### Paso 3: Configurar Base de Datos

La aplicación usa **SQLite** como base de datos local temporal. La cadena de conexión está en `appsettings.json`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Data Source=PhysicalTherapy.db"
}
```

SQLite no requiere instalación adicional y crea automáticamente el archivo de base de datos `PhysicalTherapy.db` en el directorio del proyecto.

### Paso 4: Crear Base de Datos

La aplicación creará automáticamente la base de datos al iniciar. También puedes hacerlo manualmente:

```bash
# Instalar herramientas de EF Core (si no las tienes)
dotnet tool install --global dotnet-ef

# Crear migración inicial
dotnet ef migrations add InitialCreate

# Aplicar migración
dotnet ef database update
```

### Paso 5: Ejecutar la Aplicación

```bash
dotnet run
```

La aplicación estará disponible en:
- HTTPS: `https://localhost:5001`
- HTTP: `http://localhost:5000`

## 👤 Credenciales de Administrador

Al iniciar la aplicación, se crea automáticamente un usuario administrador:

- **Email**: `admin@terapiafisica.com`
- **Contraseña**: `Admin123!`

## 📁 Estructura del Proyecto

```
PhysicalTherapyApp/
├── Controllers/          # Controladores MVC
│   ├── HomeController.cs
│   ├── AccountController.cs
│   ├── AppointmentsController.cs
│   ├── PaymentsController.cs
│   └── AdminController.cs
├── Models/              # Modelos de dominio
│   ├── ApplicationUser.cs
│   ├── Patient.cs
│   ├── Therapist.cs
│   ├── Service.cs
│   ├── Appointment.cs
│   └── Payment.cs
├── ViewModels/          # ViewModels para formularios
├── Data/                # DbContext y configuración
│   └── ApplicationDbContext.cs
├── Services/            # Servicios de negocio
│   ├── AppointmentService.cs
│   └── PaymentService.cs
├── Views/               # Vistas Razor
│   ├── Home/
│   ├── Account/
│   ├── Appointments/
│   ├── Payments/
│   └── Admin/
└── wwwroot/            # Archivos estáticos
    ├── css/
    └── js/
```

## 🎯 Funcionalidades por Rol

### Paciente
- Registrarse y crear cuenta
- Agendar citas con terapeutas
- Ver historial de citas
- Procesar pagos
- Cancelar citas

### Terapeuta
- Ver citas asignadas
- Gestionar horarios

### Administrador
- Acceso completo al sistema
- Gestionar servicios
- Crear y gestionar terapeutas
- Ver todas las citas y pagos
- Dashboard con estadísticas

## 💳 Sistema de Pagos

El sistema de pagos actual es **simulado** para propósitos de demostración. Para producción, se recomienda integrar con:
- Stripe
- PayPal
- Mercado Pago
- Otro proveedor de pagos

## 🗄️ Base de Datos

La base de datos incluye las siguientes tablas principales:

- **AspNetUsers**: Usuarios del sistema
- **AspNetRoles**: Roles (Admin, Therapist, Patient)
- **Patients**: Información de pacientes
- **Therapists**: Información de terapeutas
- **Services**: Catálogo de servicios
- **Appointments**: Citas programadas
- **Payments**: Registro de pagos

### Datos Iniciales (Seed)

Al crear la base de datos, se insertan automáticamente:
- 3 roles (Admin, Therapist, Patient)
- 1 usuario administrador
- 5 servicios de ejemplo

## 🛠️ Tecnologías Utilizadas

- **Backend**: ASP.NET Core 8.0 MVC
- **ORM**: Entity Framework Core 8.0
- **Base de Datos**: SQLite (base de datos local temporal)
- **Autenticación**: ASP.NET Identity
- **Frontend**: Razor Pages, CSS3, JavaScript
- **Validación**: jQuery Validation

## 📝 Próximos Pasos

Para mejorar la aplicación:

1. **Integrar sistema de pagos real** (Stripe, PayPal)
2. **Agregar notificaciones por email** para confirmación de citas
3. **Implementar calendario visual** para selección de horarios
4. **Agregar reportes y estadísticas** más detalladas
5. **Implementar sistema de recordatorios** automáticos
6. **Agregar chat en tiempo real** entre paciente y terapeuta
7. **Crear aplicación móvil** con Xamarin o MAUI

## 🐛 Solución de Problemas

### Error: "No se puede conectar a la base de datos"
- Verifica que SQL Server LocalDB esté instalado
- Revisa la cadena de conexión en `appsettings.json`

### Error: "dotnet command not found"
- Instala .NET 8 SDK desde el sitio oficial
- Reinicia tu terminal después de la instalación

### Error al ejecutar migraciones
```bash
# Eliminar base de datos y recrear
dotnet ef database drop
dotnet ef database update
```

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 👥 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📞 Soporte

Para preguntas o soporte, contacta a: admin@terapiafisica.com
