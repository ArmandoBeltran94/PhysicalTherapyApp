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
    [Authorize]
    public class PaymentsController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly IPaymentService _paymentService;
        private readonly UserManager<ApplicationUser> _userManager;

        public PaymentsController(
            ApplicationDbContext context,
            IPaymentService paymentService,
            UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _paymentService = paymentService;
            _userManager = userManager;
        }

        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Index()
        {
            var payments = await _paymentService.GetAllPaymentsAsync();
            return View(payments);
        }

        [HttpGet]
        public async Task<IActionResult> Process(int appointmentId)
        {
            var appointment = await _context.Appointments
                .Include(a => a.Service)
                .Include(a => a.Patient)
                    .ThenInclude(p => p.User)
                .Include(a => a.Therapist)
                    .ThenInclude(t => t.User)
                .FirstOrDefaultAsync(a => a.Id == appointmentId);

            if (appointment == null)
                return NotFound();

            // Check if already paid
            var existingPayment = await _paymentService.GetPaymentByAppointmentIdAsync(appointmentId);
            if (existingPayment != null && existingPayment.Status == PaymentStatus.Completed)
            {
                TempData["Info"] = "Esta cita ya ha sido pagada";
                return RedirectToAction("Index", "Appointments");
            }

            var model = new ProcessPaymentViewModel
            {
                AppointmentId = appointment.Id,
                Amount = appointment.Service.Price,
                ServiceName = appointment.Service.Name,
                TherapistName = appointment.Therapist.User.FullName,
                AppointmentDate = appointment.AppointmentDate
            };

            return View(model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Process(ProcessPaymentViewModel model)
        {
            if (ModelState.IsValid)
            {
                var payment = new Payment
                {
                    AppointmentId = model.AppointmentId,
                    Amount = model.Amount,
                    PaymentMethod = model.PaymentMethod,
                    Status = PaymentStatus.Pending,
                    PaymentDate = DateTime.UtcNow
                };

                var success = await _paymentService.ProcessPaymentAsync(payment);

                if (success)
                {
                    TempData["Success"] = $"Pago procesado exitosamente. ID de transacción: {payment.TransactionId}";
                    return RedirectToAction("Index", "Appointments");
                }
                else
                {
                    TempData["Error"] = "El pago falló. Por favor, intente nuevamente.";
                }
            }

            return View(model);
        }
    }
}
