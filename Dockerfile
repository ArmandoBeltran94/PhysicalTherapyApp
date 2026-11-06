# ----------------------------------------------------
# Multi-stage Dockerfile para AWS Lambda (.NET 8)
# Permite empaquetar la app como imagen de contenedor
# sin depender de dotnet instalado localmente
# ----------------------------------------------------

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["PhysicalTherapyApp.csproj", "./"]
RUN dotnet restore "./PhysicalTherapyApp.csproj"
COPY . .
RUN dotnet publish "PhysicalTherapyApp.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM public.ecr.aws/lambda/dotnet:8
WORKDIR /var/task
COPY --from=build /app/publish .
CMD ["PhysicalTherapyApp"]
