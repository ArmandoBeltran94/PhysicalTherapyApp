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
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IAppointmentService _appointmentService;
        private readonly IPaymentService _paymentService;

        public AdminController(
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager,
            IAppointmentService appointmentService,
            IPaymentService paymentService)
        {
            _context = context;
            _userManager = userManager;
            _appointmentService = appointmentService;
            _paymentService = paymentService;
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> Dashboard()
        {
            var totalPatients = await _context.Patients.CountAsync();
            var totalTherapists = await _context.Therapists.CountAsync();
            var totalAppointments = await _context.Appointments.CountAsync();
            var pendingAppointments = await _context.Appointments
                .CountAsync(a => a.Status == AppointmentStatus.Pending);
            var totalRevenue = (await _context.Payments
                .Where(p => p.Status == PaymentStatus.Completed)
                .Select(p => p.Amount)
                .ToListAsync())
                .Sum();
            var recentAppointments = await _context.Appointments
                .Include(a => a.Patient).ThenInclude(p => p.User)
                .Include(a => a.Therapist).ThenInclude(t => t.User)
                .Include(a => a.Service)
                .OrderByDescending(a => a.CreatedAt)
                .Take(10)
                .Select(a => new {
                    a.Id,
                    a.AppointmentDate,
                    PatientName = a.Patient.User.FullName,
                    TherapistName = a.Therapist.User.FullName,
                    ServiceName = a.Service.Name,
                    a.Status
                })
                .ToListAsync();

            return Ok(new {
                totalPatients,
                totalTherapists,
                totalAppointments,
                pendingAppointments,
                totalRevenue,
                recentAppointments
            });
        }

        [HttpGet("services")]
        public async Task<IActionResult> Services()
        {
            var services = await _context.Services.OrderBy(s => s.Name).ToListAsync();
            return Ok(services);
        }

        [HttpPost("services")]
        public async Task<IActionResult> CreateService([FromBody] Service service)
        {
            if (ModelState.IsValid)
            {
                service.CreatedAt = DateTime.UtcNow;
                _context.Services.Add(service);
                await _context.SaveChangesAsync();
                return Ok(service);
            }
            return BadRequest(ModelState);
        }

        [HttpGet("services/{id}")]
        public async Task<IActionResult> GetService(int id)
        {
            var service = await _context.Services.FindAsync(id);
            if (service == null)
                return NotFound();
            
            return Ok(service);
        }

        [HttpPut("services/{id}")]
        public async Task<IActionResult> EditService(int id, [FromBody] Service service)
        {
            if (id != service.Id) return BadRequest();

            if (ModelState.IsValid)
            {
                _context.Services.Update(service);
                await _context.SaveChangesAsync();
                return Ok(service);
            }
            return BadRequest(ModelState);
        }

        [HttpGet("therapists")]
        public async Task<IActionResult> Therapists()
        {
            var therapists = await _context.Therapists
                .Include(t => t.User)
                .OrderBy(t => t.User.FullName)
                .Select(t => new {
                    t.Id,
                    t.UserId,
                    t.User.FullName,
                    t.User.Email,
                    t.Specialization,
                    t.LicenseNumber,
                    t.IsAvailable
                })
                .ToListAsync();
            return Ok(therapists);
        }

        [HttpPost("therapists")]
        public async Task<IActionResult> CreateTherapist([FromBody] CreateTherapistViewModel model)
        {
            if (ModelState.IsValid)
            {
                var user = new ApplicationUser
                {
                    UserName = model.Email,
                    Email = model.Email,
                    FullName = model.FullName,
                    PhoneNumber = model.PhoneNumber,
                    EmailConfirmed = true
                };

                var result = await _userManager.CreateAsync(user, model.Password);

                if (result.Succeeded)
                {
                    await _userManager.AddToRoleAsync(user, "Therapist");

                    var therapist = new Therapist
                    {
                        UserId = user.Id,
                        Specialization = model.Specialization,
                        LicenseNumber = model.LicenseNumber,
                        YearsOfExperience = model.YearsOfExperience,
                        Bio = model.Bio,
                        IsAvailable = true,
                        CreatedAt = DateTime.UtcNow
                    };

                    _context.Therapists.Add(therapist);
                    await _context.SaveChangesAsync();

                    return Ok(therapist);
                }

                foreach (var error in result.Errors)
                {
                    ModelState.AddModelError(string.Empty, error.Description);
                }
            }

            return BadRequest(ModelState);
        }

        [HttpPost("therapists/{id}/toggle-availability")]
        public async Task<IActionResult> ToggleTherapistAvailability(int id)
        {
            var therapist = await _context.Therapists.FindAsync(id);
            if (therapist != null)
            {
                therapist.IsAvailable = !therapist.IsAvailable;
                await _context.SaveChangesAsync();
                return Ok(new { IsAvailable = therapist.IsAvailable });
            }
            return NotFound();
        }
        [HttpPut("therapists/{id}")]
        public async Task<IActionResult> UpdateTherapist(int id, [FromBody] UpdateTherapistViewModel model)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var therapist = await _context.Therapists.Include(t => t.User).FirstOrDefaultAsync(t => t.Id == id);
            if (therapist == null) return NotFound();

            therapist.Specialization = model.Specialization;
            therapist.LicenseNumber = model.LicenseNumber;
            therapist.YearsOfExperience = model.YearsOfExperience;
            therapist.Bio = model.Bio;

            if (therapist.User != null)
            {
                therapist.User.FullName = model.FullName;
            }

            await _context.SaveChangesAsync();
            return Ok(therapist);
        }

        [HttpGet("users")]
        public async Task<IActionResult> Users()
        {
            var users = await _userManager.Users.ToListAsync();
            var userRolesList = new List<object>();
            foreach (var user in users)
            {
                var roles = await _userManager.GetRolesAsync(user);
                userRolesList.Add(new
                {
                    user.Id,
                    user.FullName,
                    user.Email,
                    user.PhoneNumber,
                    Roles = roles
                });
            }
            return Ok(userRolesList);
        }

        [HttpPut("users/{id}")]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserViewModel model)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var user = await _userManager.FindByIdAsync(id);
            if (user == null) return NotFound();

            user.FullName = model.FullName;
            user.Email = model.Email;
            user.UserName = model.Email;
            user.PhoneNumber = model.PhoneNumber;

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                return BadRequest(new { errors = result.Errors.Select(e => e.Description) });
            }

            if (!string.IsNullOrEmpty(model.Password))
            {
                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                await _userManager.ResetPasswordAsync(user, token, model.Password);
            }

            return Ok();
        }
    }
}
