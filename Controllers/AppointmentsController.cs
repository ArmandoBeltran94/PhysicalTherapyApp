using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhysicalTherapyApp.Data;
using PhysicalTherapyApp.Models;
using PhysicalTherapyApp.Services;
using PhysicalTherapyApp.ViewModels;

namespace PhysicalTherapyApp.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AppointmentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IAppointmentService _appointmentService;
        private readonly UserManager<ApplicationUser> _userManager;

        public AppointmentsController(
            ApplicationDbContext context,
            IAppointmentService appointmentService,
            UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _appointmentService = appointmentService;
            _userManager = userManager;
        }

        [HttpGet]
        public async Task<IActionResult> Index()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
                return Unauthorized();

            IEnumerable<Appointment> appointments;

            if (User.IsInRole("Admin"))
            {
                appointments = await _appointmentService.GetAllAppointmentsAsync();
            }
            else if (User.IsInRole("Therapist"))
            {
                var therapist = await _context.Therapists.FirstOrDefaultAsync(t => t.UserId == user.Id);
                if (therapist == null)
                    return NotFound();
                
                appointments = await _appointmentService.GetAppointmentsByTherapistIdAsync(therapist.Id);
            }
            else
            {
                var patient = await _context.Patients.FirstOrDefaultAsync(p => p.UserId == user.Id);
                if (patient == null)
                {
                    patient = new Patient
                    {
                        UserId = user.Id,
                        DateOfBirth = DateTime.UtcNow.AddYears(-30),
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Patients.Add(patient);
                    await _context.SaveChangesAsync();
                }
                
                appointments = await _appointmentService.GetAppointmentsByPatientIdAsync(patient.Id);
            }

            var result = appointments.Select(a => new {
                a.Id,
                a.AppointmentDate,
                a.Status,
                PatientName = a.Patient.User.FullName,
                TherapistName = a.Therapist.User.FullName,
                ServiceName = a.Service.Name,
                a.Service.Price
            });

            return Ok(result);
        }

        [HttpGet("form-data")]
        public async Task<IActionResult> GetFormData()
        {
            var therapists = await _context.Therapists
                .Include(t => t.User)
                .Where(t => t.IsAvailable)
                .Select(t => new { t.Id, Name = t.User.FullName })
                .ToListAsync();

            var services = await _context.Services
                .Where(s => s.IsActive)
                .Select(s => new { s.Id, s.Name, s.DurationMinutes, s.Price })
                .ToListAsync();

            return Ok(new { therapists, services });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateAppointmentViewModel model)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.UserId == user.Id);

            if (patient == null)
            {
                patient = new Patient
                {
                    UserId = user.Id,
                    DateOfBirth = DateTime.UtcNow.AddYears(-30),
                    CreatedAt = DateTime.UtcNow
                };
                _context.Patients.Add(patient);
                await _context.SaveChangesAsync();
            }

            var service = await _context.Services.FindAsync(model.ServiceId);
            if (service == null) return NotFound();

            var appointment = new Appointment
            {
                PatientId = patient.Id,
                TherapistId = model.TherapistId,
                ServiceId = model.ServiceId,
                AppointmentDate = model.AppointmentDate,
                DurationMinutes = service.DurationMinutes,
                Notes = model.Notes,
                Status = AppointmentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            var success = await _appointmentService.CreateAppointmentAsync(appointment);

            if (success) return Ok(appointment);
            
            return BadRequest(new { message = "El horario seleccionado no está disponible" });
        }

        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> Cancel(int id)
        {
            var success = await _appointmentService.CancelAppointmentAsync(id);
            if (success) return Ok();
            return BadRequest(new { message = "No se pudo cancelar la cita" });
        }

        [HttpGet("available-slots")]
        public async Task<IActionResult> GetAvailableSlots([FromQuery] int therapistId, [FromQuery] DateTime date, [FromQuery] int durationMinutes)
        {
            var slots = await _appointmentService.GetAvailableTimeSlotsAsync(therapistId, date, durationMinutes);
            return Ok(slots.Select(s => new { time = s.ToString("HH:mm"), value = s.ToString("o") }));
        }
    }
}
