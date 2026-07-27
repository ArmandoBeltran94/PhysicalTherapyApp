using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PhysicalTherapyApp.Data;
using PhysicalTherapyApp.Models;

namespace PhysicalTherapyApp.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Therapist")]
    public class TherapistController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public TherapistController(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        [HttpGet("appointments")]
        public async Task<IActionResult> GetMyAppointments()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var therapist = await _context.Therapists.FirstOrDefaultAsync(t => t.UserId == user.Id);
            if (therapist == null) return NotFound("Therapist profile not found.");

            var appointments = await _context.Appointments
                .Include(a => a.Patient).ThenInclude(p => p.User)
                .Include(a => a.Service)
                .Include(a => a.Payment)
                .Where(a => a.TherapistId == therapist.Id)
                .OrderBy(a => a.AppointmentDate)
                .Select(a => new {
                    a.Id,
                    a.AppointmentDate,
                    PatientName = a.Patient.User.FullName,
                    ServiceName = a.Service.Name,
                    a.Status,
                    a.IsPaid,
                    a.Notes
                })
                .ToListAsync();

            return Ok(appointments);
        }

        [HttpPut("appointments/{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return Unauthorized();

            var therapist = await _context.Therapists.FirstOrDefaultAsync(t => t.UserId == user.Id);
            if (therapist == null) return NotFound("Therapist profile not found.");

            var appointment = await _context.Appointments.FirstOrDefaultAsync(a => a.Id == id && a.TherapistId == therapist.Id);
            if (appointment == null) return NotFound();

            if (!Enum.IsDefined(typeof(AppointmentStatus), dto.Status))
            {
                return BadRequest("Invalid status.");
            }

            appointment.Status = (AppointmentStatus)dto.Status;
            await _context.SaveChangesAsync();

            return Ok(new { success = true, status = appointment.Status });
        }
    }

    public class UpdateStatusDto
    {
        public int Status { get; set; }
    }
}
