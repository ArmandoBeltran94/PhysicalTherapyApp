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
    [Authorize(Roles = "Admin")]
    public class AdminController : Controller
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

        public async Task<IActionResult> Dashboard()
        {
            var model = new AdminDashboardViewModel
            {
                TotalPatients = await _context.Patients.CountAsync(),
                TotalTherapists = await _context.Therapists.CountAsync(),
                TotalAppointments = await _context.Appointments.CountAsync(),
                PendingAppointments = await _context.Appointments
                    .CountAsync(a => a.Status == AppointmentStatus.Pending),
                TotalRevenue = await _context.Payments
                    .Where(p => p.Status == PaymentStatus.Completed)
                    .SumAsync(p => p.Amount),
                RecentAppointments = await _context.Appointments
                    .Include(a => a.Patient).ThenInclude(p => p.User)
                    .Include(a => a.Therapist).ThenInclude(t => t.User)
                    .Include(a => a.Service)
                    .OrderByDescending(a => a.CreatedAt)
                    .Take(10)
                    .ToListAsync()
            };

            return View(model);
        }

        // Services Management
        public async Task<IActionResult> Services()
        {
            var services = await _context.Services.OrderBy(s => s.Name).ToListAsync();
            return View(services);
        }

        [HttpGet]
        public IActionResult CreateService()
        {
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateService(Service service)
        {
            if (ModelState.IsValid)
            {
                service.CreatedAt = DateTime.UtcNow;
                _context.Services.Add(service);
                await _context.SaveChangesAsync();
                TempData["Success"] = "Servicio creado exitosamente";
                return RedirectToAction(nameof(Services));
            }
            return View(service);
        }

        [HttpGet]
        public async Task<IActionResult> EditService(int id)
        {
            var service = await _context.Services.FindAsync(id);
            if (service == null)
                return NotFound();
            
            return View(service);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditService(Service service)
        {
            if (ModelState.IsValid)
            {
                _context.Services.Update(service);
                await _context.SaveChangesAsync();
                TempData["Success"] = "Servicio actualizado exitosamente";
                return RedirectToAction(nameof(Services));
            }
            return View(service);
        }

        // Therapists Management
        public async Task<IActionResult> Therapists()
        {
            var therapists = await _context.Therapists
                .Include(t => t.User)
                .OrderBy(t => t.User.FullName)
                .ToListAsync();
            return View(therapists);
        }

        [HttpGet]
        public IActionResult CreateTherapist()
        {
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateTherapist(CreateTherapistViewModel model)
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

                    TempData["Success"] = "Terapeuta creado exitosamente";
                    return RedirectToAction(nameof(Therapists));
                }

                foreach (var error in result.Errors)
                {
                    ModelState.AddModelError(string.Empty, error.Description);
                }
            }

            return View(model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ToggleTherapistAvailability(int id)
        {
            var therapist = await _context.Therapists.FindAsync(id);
            if (therapist != null)
            {
                therapist.IsAvailable = !therapist.IsAvailable;
                await _context.SaveChangesAsync();
                TempData["Success"] = "Disponibilidad actualizada";
            }
            return RedirectToAction(nameof(Therapists));
        }
    }
}
