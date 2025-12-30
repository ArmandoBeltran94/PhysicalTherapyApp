using Microsoft.EntityFrameworkCore;
using PhysicalTherapyApp.Data;
using PhysicalTherapyApp.Models;

namespace PhysicalTherapyApp.Services
{
    public class PaymentService : IPaymentService
    {
        private readonly ApplicationDbContext _context;

        public PaymentService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Payment?> GetPaymentByIdAsync(int id)
        {
            return await _context.Payments
                .Include(p => p.Appointment)
                    .ThenInclude(a => a.Service)
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<Payment?> GetPaymentByAppointmentIdAsync(int appointmentId)
        {
            return await _context.Payments
                .Include(p => p.Appointment)
                    .ThenInclude(a => a.Service)
                .FirstOrDefaultAsync(p => p.AppointmentId == appointmentId);
        }

        public async Task<IEnumerable<Payment>> GetAllPaymentsAsync()
        {
            return await _context.Payments
                .Include(p => p.Appointment)
                    .ThenInclude(a => a.Patient)
                        .ThenInclude(p => p.User)
                .Include(p => p.Appointment)
                    .ThenInclude(a => a.Service)
                .OrderByDescending(p => p.PaymentDate)
                .ToListAsync();
        }

        public async Task<bool> ProcessPaymentAsync(Payment payment)
        {
            try
            {
                // Simulate payment processing
                // In production, integrate with real payment gateway (Stripe, PayPal, etc.)
                
                // Simulate a 95% success rate
                var random = new Random();
                var isSuccessful = random.Next(100) < 95;

                if (isSuccessful)
                {
                    payment.Status = PaymentStatus.Completed;
                    payment.TransactionId = $"TXN-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}";
                    payment.PaymentDate = DateTime.UtcNow;
                }
                else
                {
                    payment.Status = PaymentStatus.Failed;
                    payment.Notes = "Payment processing failed. Please try again.";
                }

                _context.Payments.Add(payment);
                await _context.SaveChangesAsync();

                return isSuccessful;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> RefundPaymentAsync(int paymentId)
        {
            try
            {
                var payment = await _context.Payments.FindAsync(paymentId);
                if (payment == null || payment.Status != PaymentStatus.Completed)
                    return false;

                // Simulate refund processing
                payment.Status = PaymentStatus.Refunded;
                payment.Notes = $"Refunded on {DateTime.UtcNow:yyyy-MM-dd HH:mm}";
                
                await _context.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}
