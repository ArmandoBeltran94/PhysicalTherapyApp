using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhysicalTherapyApp.Data;
using PhysicalTherapyApp.Models;
using System.ComponentModel.DataAnnotations;

namespace PhysicalTherapyApp.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AppointmentRequestsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public AppointmentRequestsController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        [HttpPost]
        [AllowAnonymous]
        public async Task<IActionResult> Create([FromBody] CreateAppointmentRequestDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var request = new AppointmentRequest
            {
                PatientName = dto.PatientName,
                PhoneNumber = dto.PhoneNumber,
                Notes = dto.Notes,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            _context.AppointmentRequests.Add(request);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Petición enviada exitosamente" });
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetPendingRequests()
        {
            var requests = await _context.AppointmentRequests
                .Where(r => r.Status == "Pending")
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return Ok(requests);
        }

        [HttpPost("{id}/process")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ProcessRequest(int id, [FromBody] ProcessAppointmentRequestDto dto)
        {
            var request = await _context.AppointmentRequests.FindAsync(id);
            if (request == null)
            {
                return NotFound();
            }

            if (request.Status == "Processed")
            {
                return BadRequest(new { message = "Esta petición ya ha sido procesada." });
            }

            // Create patient account
            string email = $"guest_{Guid.NewGuid().ToString().Substring(0, 8)}@temp.com";
            
            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                FullName = request.PatientName,
                PhoneNumber = request.PhoneNumber,
                EmailConfirmed = true
            };

            // dummy password
            var result = await _userManager.CreateAsync(user, "GuestUser123!");
            if (!result.Succeeded)
            {
                return BadRequest(new { message = "Error al crear la cuenta de usuario para el paciente." });
            }

            await _userManager.AddToRoleAsync(user, "Patient");

            var patient = new Patient
            {
                UserId = user.Id,
                DateOfBirth = DateTime.UtcNow.AddYears(-30), // Dummy date of birth
                CreatedAt = DateTime.UtcNow
            };
            
            _context.Patients.Add(patient);
            await _context.SaveChangesAsync();

            var service = await _context.Services.FindAsync(dto.ServiceId);
            if (service == null)
            {
                return BadRequest(new { message = "Servicio no encontrado." });
            }

            var appointment = new Appointment
            {
                PatientId = patient.Id,
                TherapistId = dto.TherapistId,
                ServiceId = dto.ServiceId,
                AppointmentDate = dto.AppointmentDate,
                DurationMinutes = service.DurationMinutes,
                Notes = request.Notes,
                Status = AppointmentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            _context.Appointments.Add(appointment);
            
            request.Status = "Processed";

            await _context.SaveChangesAsync();

            return Ok(new { message = "Cita creada y petición procesada exitosamente." });
        }
    }

    public class CreateAppointmentRequestDto
    {
        [Required]
        [MaxLength(100)]
        public string PatientName { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string PhoneNumber { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Notes { get; set; }
    }

    public class ProcessAppointmentRequestDto
    {
        [Required]
        public int TherapistId { get; set; }

        [Required]
        public int ServiceId { get; set; }

        [Required]
        public DateTime AppointmentDate { get; set; }
    }
}
