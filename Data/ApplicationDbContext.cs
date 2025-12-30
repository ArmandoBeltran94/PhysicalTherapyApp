using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PhysicalTherapyApp.Models;
using Microsoft.AspNetCore.Identity;

namespace PhysicalTherapyApp.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<Patient> Patients { get; set; }
        public DbSet<Therapist> Therapists { get; set; }
        public DbSet<Service> Services { get; set; }
        public DbSet<Appointment> Appointments { get; set; }
        public DbSet<Payment> Payments { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Configure relationships
            builder.Entity<Patient>()
                .HasOne(p => p.User)
                .WithOne(u => u.Patient)
                .HasForeignKey<Patient>(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Therapist>()
                .HasOne(t => t.User)
                .WithOne(u => u.Therapist)
                .HasForeignKey<Therapist>(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Appointment>()
                .HasOne(a => a.Patient)
                .WithMany(p => p.Appointments)
                .HasForeignKey(a => a.PatientId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Appointment>()
                .HasOne(a => a.Therapist)
                .WithMany(t => t.Appointments)
                .HasForeignKey(a => a.TherapistId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Appointment>()
                .HasOne(a => a.Service)
                .WithMany(s => s.Appointments)
                .HasForeignKey(a => a.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Payment>()
                .HasOne(p => p.Appointment)
                .WithOne(a => a.Payment)
                .HasForeignKey<Payment>(p => p.AppointmentId)
                .OnDelete(DeleteBehavior.Cascade);

            // Seed initial data
            SeedData(builder);
        }

        private void SeedData(ModelBuilder builder)
        {
            // Seed Roles
            var adminRoleId = "1";
            var therapistRoleId = "2";
            var patientRoleId = "3";

            builder.Entity<IdentityRole>().HasData(
                new IdentityRole { Id = adminRoleId, Name = "Admin", NormalizedName = "ADMIN" },
                new IdentityRole { Id = therapistRoleId, Name = "Therapist", NormalizedName = "THERAPIST" },
                new IdentityRole { Id = patientRoleId, Name = "Patient", NormalizedName = "PATIENT" }
            );

            // Seed Admin User
            var adminUserId = "admin-user-id";
            var hasher = new PasswordHasher<ApplicationUser>();
            
            var adminUser = new ApplicationUser
            {
                Id = adminUserId,
                UserName = "admin@terapiafisica.com",
                NormalizedUserName = "ADMIN@TERAPIAFISICA.COM",
                Email = "admin@terapiafisica.com",
                NormalizedEmail = "ADMIN@TERAPIAFISICA.COM",
                EmailConfirmed = true,
                FullName = "Administrador del Sistema",
                PhoneNumber = "+1234567890",
                SecurityStamp = Guid.NewGuid().ToString()
            };
            
            adminUser.PasswordHash = hasher.HashPassword(adminUser, "Admin123!");

            builder.Entity<ApplicationUser>().HasData(adminUser);

            builder.Entity<IdentityUserRole<string>>().HasData(
                new IdentityUserRole<string> { RoleId = adminRoleId, UserId = adminUserId }
            );

            // Seed Services
            builder.Entity<Service>().HasData(
                new Service
                {
                    Id = 1,
                    Name = "Terapia de Rehabilitación",
                    Description = "Sesión de rehabilitación física personalizada para recuperación de lesiones",
                    Price = 50.00m,
                    DurationMinutes = 60,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new Service
                {
                    Id = 2,
                    Name = "Masaje Terapéutico",
                    Description = "Masaje especializado para alivio de dolor muscular y tensión",
                    Price = 40.00m,
                    DurationMinutes = 45,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new Service
                {
                    Id = 3,
                    Name = "Terapia Deportiva",
                    Description = "Tratamiento especializado para atletas y lesiones deportivas",
                    Price = 60.00m,
                    DurationMinutes = 60,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new Service
                {
                    Id = 4,
                    Name = "Electroterapia",
                    Description = "Tratamiento con corrientes eléctricas para dolor y recuperación muscular",
                    Price = 35.00m,
                    DurationMinutes = 30,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new Service
                {
                    Id = 5,
                    Name = "Terapia Postural",
                    Description = "Corrección de postura y prevención de problemas musculoesqueléticos",
                    Price = 45.00m,
                    DurationMinutes = 45,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                }
            );
        }
    }
}
