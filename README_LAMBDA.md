# 🚀 Guía de Despliegue en AWS Lambda (.NET 8)

Esta aplicación está configurada para ejecutarse como una **ASP.NET Core 8 Web API** sobre **AWS Lambda** con **Amazon API Gateway (HTTP API)**.

---

## 🗄️ 1. Paso Obligatorio: Base de Datos en la Nube (PostgreSQL)

En AWS Lambda, el almacenamiento local se destruye entre ejecuciones. Por tanto, no se puede usar SQLite en producción.
El proyecto ya está preparado con soporte nativo para **PostgreSQL** a través de `Npgsql.EntityFrameworkCore.PostgreSQL`.

### Opciones recomendadas gratuitas / serverless:
1. **Neon** (https://neon.tech): PostgreSQL Serverless con capa gratuita generosa.
2. **Supabase** (https://supabase.com): PostgreSQL gestionado con capa gratuita.
3. **AWS RDS Aurora Serverless v2**: Base de datos nativa de AWS con autoescalado.

Solo debes configurar la variable de entorno `ConnectionStrings__DefaultConnection` o cambiar la cadena en `appsettings.Production.json`:
```text
Host=ep-xyz.aws.neon.tech;Port=5432;Database=neondb;Username=tu_usuario;Password=tu_password;SSL Mode=Require;Trust Server Certificate=true
```
*Al iniciar la primera vez en Lambda, `context.Database.EnsureCreated()` creará automáticamente las tablas y los datos iniciales (roles, administrador, servicios).*

---

## 🛠️ 2. Opciones de Despliegue a AWS Lambda

### Opción A: Usando AWS SAM CLI (Recomendado)
1. Instala AWS SAM CLI: `sam --version`
2. Configura tus credenciales de AWS: `aws configure`
3. Construye y despliega:
   ```bash
   sam build
   sam deploy --guided
   ```

### Opción B: Usando la herramienta oficial .NET Lambda CLI
1. Instalar la herramienta global:
   ```bash
   dotnet tool install -g Amazon.Lambda.Tools
   ```
2. Desplegar:
   ```bash
   dotnet lambda deploy-serverless --template serverless.template
   ```

### Opción C: Mediante Contenedor Docker (ECR + Lambda)
Si no tienes .NET instalado en tu máquina o usas CI/CD:
```bash
# Construir imagen Docker de Lambda
docker build -t physical-therapy-api:latest .

# Subir a AWS ECR y vincular a una función Lambda
```

---

## 🌐 3. Conectar el Frontend (`client-app`)

Una vez desplegada la función Lambda, API Gateway te devolverá una URL como:
`https://abc123xyz.execute-api.us-east-1.amazonaws.com`

En tu proyecto `client-app`:
1. Crea o edita el archivo `.env`:
   ```env
   VITE_API_URL=https://abc123xyz.execute-api.us-east-1.amazonaws.com/api
   ```
2. El frontend se conectará inmediatamente a tu API en AWS Lambda.
