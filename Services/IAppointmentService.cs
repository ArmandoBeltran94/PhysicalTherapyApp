using PhysicalTherapyApp.Models;

namespace PhysicalTherapyApp.Services
{
    public interface IAppointmentService
    {
        Task<IEnumerable<Appointment>> GetAppointmentsByPatientIdAsync(int patientId);
        Task<IEnumerable<Appointment>> GetAppointmentsByTherapistIdAsync(int therapistId);
        Task<IEnumerable<Appointment>> GetAllAppointmentsAsync();
        Task<Appointment?> GetAppointmentByIdAsync(int id);
        Task<bool> CreateAppointmentAsync(Appointment appointment);
        Task<bool> UpdateAppointmentAsync(Appointment appointment);
        Task<bool> CancelAppointmentAsync(int id);
        Task<IEnumerable<DateTime>> GetAvailableTimeSlotsAsync(int therapistId, DateTime date, int durationMinutes);
        Task<bool> IsTimeSlotAvailableAsync(int therapistId, DateTime appointmentDate, int durationMinutes, int? excludeAppointmentId = null);
    }
}
