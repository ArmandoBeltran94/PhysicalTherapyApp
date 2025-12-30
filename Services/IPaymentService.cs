using PhysicalTherapyApp.Models;

namespace PhysicalTherapyApp.Services
{
    public interface IPaymentService
    {
        Task<Payment?> GetPaymentByIdAsync(int id);
        Task<Payment?> GetPaymentByAppointmentIdAsync(int appointmentId);
        Task<IEnumerable<Payment>> GetAllPaymentsAsync();
        Task<bool> ProcessPaymentAsync(Payment payment);
        Task<bool> RefundPaymentAsync(int paymentId);
    }
}
