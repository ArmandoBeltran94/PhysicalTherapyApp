using System.Text;
using Amazon.Lambda.AspNetCoreServer.Hosting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PhysicalTherapyApp.Data;
using PhysicalTherapyApp.Models;
using PhysicalTherapyApp.Services;

var builder = WebApplication.CreateBuilder(args);

// Enable AWS Lambda hosting (works seamlessly in Lambda; automatically falls back to Kestrel locally)
builder.Services.AddAWSLambdaHosting(LambdaEventSource.HttpApi);

// Database configuration: Supports PostgreSQL (for AWS Lambda / Cloud) and SQLite (local dev)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

var dbProvider = builder.Configuration.GetValue<string>("DatabaseProvider") ?? 
    (connectionString.Contains("Host=", StringComparison.OrdinalIgnoreCase) || 
     connectionString.Contains("Server=", StringComparison.OrdinalIgnoreCase) ? "PostgreSQL" : "SQLite");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    if (dbProvider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
    {
        options.UseNpgsql(connectionString);
    }
    else
    {
        options.UseSqlite(connectionString);
    }
});

builder.Services.AddDatabaseDeveloperPageExceptionFilter();

builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.SignIn.RequireConfirmedAccount = false;
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredLength = 6;
})
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddDefaultTokenProviders();

// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var key = Encoding.ASCII.GetBytes(jwtSettings["Key"] ?? "SuperSecretKeyForPhysicalTherapyApp1234567890!!!");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

// Configure CORS (configurable for CloudFront/custom domain in AWS, defaults to localhost)
var configuredOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
    ?? new[] { "http://localhost:5173", "http://localhost:5174" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins(configuredOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Register application services
builder.Services.AddScoped<IAppointmentService, AppointmentService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseMigrationsEndPoint();
}
else
{
    app.UseHsts();
}

// app.UseHttpsRedirection();

app.UseCors("AllowReactApp");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Initialize database
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        // Use EnsureCreated to automatically create database schema
        context.Database.EnsureCreated();

        // Create AppointmentRequests table manually only if SQLite is used
        if (context.Database.IsSqlite())
        {
            try
            {
                context.Database.ExecuteSqlRaw(@"
                    CREATE TABLE IF NOT EXISTS ""AppointmentRequests"" (
                        ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_AppointmentRequests"" PRIMARY KEY AUTOINCREMENT,
                        ""PatientName"" TEXT NOT NULL,
                        ""PhoneNumber"" TEXT NOT NULL,
                        ""Notes"" TEXT NULL,
                        ""Status"" TEXT NOT NULL,
                        ""CreatedAt"" TEXT NOT NULL
                    );
                ");
            }
            catch (Exception ex)
            {
                var logger = services.GetRequiredService<ILogger<Program>>();
                logger.LogWarning(ex, "Table AppointmentRequests might already exist or couldn't be created manually.");
            }
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while creating the database.");
    }
}

app.Run();
