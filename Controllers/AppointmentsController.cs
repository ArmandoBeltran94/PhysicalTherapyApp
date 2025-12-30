using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using PhysicalTherapyApp.Data;
using PhysicalTherapyApp.Models;
using PhysicalTherapyApp.Services;
using PhysicalTherapyApp.ViewModels;

namespace PhysicalTherapyApp.Controllers
{
    [Authorize]
    public class AppointmentsController : Controller
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

        public async Task<IActionResult> Index()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
                return RedirectToAction("Login", "Account");

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
                    // Create patient record if doesn't exist
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

            return View(appointments);
        }

        [HttpGet]
        public async Task<IActionResult> Create()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
                return RedirectToAction("Login", "Account");

            var patient = await _context.Patients.FirstOrDefaultAsync(p => p.UserId == user.Id);
            if (patient == null)
            {
                // Create patient record if doesn't exist
                patient = new Patient
                {
                    UserId = user.Id,
                    DateOfBirth = DateTime.UtcNow.AddYears(-30),
                    CreatedAt = DateTime.UtcNow
                };
                _context.Patients.Add(patient);
                await _context.SaveChangesAsync();
            }

            ViewBag.Therapists = new SelectList(
                await _context.Therapists
                    .Include(t => t.User)
                    .Where(t => t.IsAvailable)
                    .ToListAsync(),
                "Id",
                "User.FullName"
            );

            ViewBag.Services = new SelectList(
                await _context.Services.Where(s => s.IsActive).ToListAsync(),
                "Id",
                "Name"
            );

            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(CreateAppointmentViewModel model)
        {
            if (ModelState.IsValid)
            {
                var user = await _userManager.GetUserAsync(User);
                var patient = await _context.Patients.FirstOrDefaultAsync(p => p.UserId == user!.Id);

                if (patient == null)
                    return NotFound();

                var service = await _context.Services.FindAsync(model.ServiceId);
                if (service == null)
                    return NotFound();

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

                if (success)
                {
                    TempData["Success"] = "Cita creada exitosamente";
                    return RedirectToAction(nameof(Index));
                }
                else
                {
                    ModelState.AddModelError("", "El horario seleccionado no está disponible");
                }
            }

            ViewBag.Therapists = new SelectList(
                await _context.Therapists
                    .Include(t => t.User)
                    .Where(t => t.IsAvailable)
                    .ToListAsync(),
                "Id",
                "User.FullName"
            );

            ViewBag.Services = new SelectList(
                await _context.Services.Where(s => s.IsActive).ToListAsync(),
                "Id",
                "Name"
            );

            return View(model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Cancel(int id)
        {
            var success = await _appointmentService.CancelAppointmentAsync(id);
            
            if (success)
            {
                TempData["Success"] = "Cita cancelada exitosamente";
            }
            else
            {
                TempData["Error"] = "No se pudo cancelar la cita";
            }

            return RedirectToAction(nameof(Index));
        }

        [HttpGet]
        public async Task<IActionResult> GetAvailableSlots(int therapistId, DateTime date, int durationMinutes)
        {
            var slots = await _appointmentService.GetAvailableTimeSlotsAsync(therapistId, date, durationMinutes);
            return Json(slots.Select(s => new { time = s.ToString("HH:mm"), value = s.ToString("o") }));
        }
    }
}
