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
    public class PaymentsController : ControllerBase
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

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Index()
        {
            var payments = await _paymentService.GetAllPaymentsAsync();
            var result = payments.Select(p => new {
                p.Id,
                p.Amount,
                p.PaymentDate,
                p.PaymentMethod,
                p.Status,
                p.TransactionId,
                PatientName = p.Appointment.Patient.User.FullName,
                ServiceName = p.Appointment.Service.Name,
                IsPaid = p.Appointment.IsPaid
            });
            return Ok(result);
        }

        [HttpGet("appointment/{appointmentId}")]
        public async Task<IActionResult> GetPaymentDetails(int appointmentId)
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

            var existingPayment = await _paymentService.GetPaymentByAppointmentIdAsync(appointmentId);
            if (existingPayment != null && existingPayment.Status == PaymentStatus.Completed)
            {
                return BadRequest(new { message = "Esta cita ya ha sido pagada" });
            }

            return Ok(new
            {
                appointmentId = appointment.Id,
                amount = appointment.Service.Price,
                serviceName = appointment.Service.Name,
                therapistName = appointment.Therapist.User.FullName,
                appointmentDate = appointment.AppointmentDate,
                isPaid = appointment.IsPaid
            });
        }

        [HttpPost("process")]
        public async Task<IActionResult> Process([FromBody] ProcessPaymentViewModel model)
        {
            if (ModelState.IsValid)
            {
                var payment = new Payment
                {
                    AppointmentId = model.AppointmentId,
                    Amount = model.Amount,
                    PaymentMethod = model.PaymentMethod,
                    Status = PaymentStatus.Pending,
                    PaymentDate = DateTime.UtcNow,
                    Appointment = await _context.Appointments.FindAsync(model.AppointmentId)
                };

                var success = await _paymentService.ProcessPaymentAsync(payment);

                if (success)
                {
                    return Ok(new { message = "Pago procesado exitosamente", transactionId = payment.TransactionId });
                }
                
                return BadRequest(new { message = "El pago falló. Por favor, intente nuevamente." });
            }

            return BadRequest(ModelState);
        }
    }
}
