using Microsoft.EntityFrameworkCore;
using PhysicalTherapyApp.Data;
using PhysicalTherapyApp.Models;

namespace PhysicalTherapyApp.Services
{
    public class AppointmentService : IAppointmentService
    {
        private readonly ApplicationDbContext _context;

        public AppointmentService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Appointment>> GetAppointmentsByPatientIdAsync(int patientId)
        {
            return await _context.Appointments
                .Include(a => a.Patient)
                .Include(a => a.Therapist)
                    .ThenInclude(t => t.User)
                .Include(a => a.Service)
                .Include(a => a.Payment)
                .Where(a => a.PatientId == patientId)
                .OrderByDescending(a => a.AppointmentDate)
                .ToListAsync();
        }

        public async Task<IEnumerable<Appointment>> GetAppointmentsByTherapistIdAsync(int therapistId)
        {
            return await _context.Appointments
                .Include(a => a.Patient)
                    .ThenInclude(p => p.User)
                .Include(a => a.Therapist)
                .Include(a => a.Service)
                .Include(a => a.Payment)
                .Where(a => a.TherapistId == therapistId)
                .OrderBy(a => a.AppointmentDate)
                .ToListAsync();
        }

        public async Task<IEnumerable<Appointment>> GetAllAppointmentsAsync()
        {
            return await _context.Appointments
                .Include(a => a.Patient)
                    .ThenInclude(p => p.User)
                .Include(a => a.Therapist)
                    .ThenInclude(t => t.User)
                .Include(a => a.Service)
                .Include(a => a.Payment)
                .OrderByDescending(a => a.AppointmentDate)
                .ToListAsync();
        }

        public async Task<Appointment?> GetAppointmentByIdAsync(int id)
        {
            return await _context.Appointments
                .Include(a => a.Patient)
                    .ThenInclude(p => p.User)
                .Include(a => a.Therapist)
                    .ThenInclude(t => t.User)
                .Include(a => a.Service)
                .Include(a => a.Payment)
                .FirstOrDefaultAsync(a => a.Id == id);
        }

        public async Task<bool> CreateAppointmentAsync(Appointment appointment)
        {
            try
            {
                // Check if time slot is available
                var isAvailable = await IsTimeSlotAvailableAsync(
                    appointment.TherapistId,
                    appointment.AppointmentDate,
                    appointment.DurationMinutes
                );

                if (!isAvailable)
                    return false;

                _context.Appointments.Add(appointment);
                await _context.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> UpdateAppointmentAsync(Appointment appointment)
        {
            try
            {
                // Check if time slot is available (excluding current appointment)
                var isAvailable = await IsTimeSlotAvailableAsync(
                    appointment.TherapistId,
                    appointment.AppointmentDate,
                    appointment.DurationMinutes,
                    appointment.Id
                );

                if (!isAvailable)
                    return false;

                appointment.UpdatedAt = DateTime.UtcNow;
                _context.Appointments.Update(appointment);
                await _context.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<bool> CancelAppointmentAsync(int id)
        {
            try
            {
                var appointment = await _context.Appointments.FindAsync(id);
                if (appointment == null)
                    return false;

                appointment.Status = AppointmentStatus.Cancelled;
                appointment.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return true;
            }
            catch
            {
                return false;
            }
        }

        public async Task<IEnumerable<DateTime>> GetAvailableTimeSlotsAsync(int therapistId, DateTime date, int durationMinutes)
        {
            var availableSlots = new List<DateTime>();
            var startHour = 8; // 8 AM
            var endHour = 18; // 6 PM

            var dateOnly = date.Date;

            for (int hour = startHour; hour < endHour; hour++)
            {
                for (int minute = 0; minute < 60; minute += 30)
                {
                    var slotTime = dateOnly.AddHours(hour).AddMinutes(minute);
                    
                    if (await IsTimeSlotAvailableAsync(therapistId, slotTime, durationMinutes))
                    {
                        availableSlots.Add(slotTime);
                    }
                }
            }

            return availableSlots;
        }

        public async Task<bool> IsTimeSlotAvailableAsync(int therapistId, DateTime appointmentDate, int durationMinutes, int? excludeAppointmentId = null)
        {
            var appointmentEnd = appointmentDate.AddMinutes(durationMinutes);

            var conflictingAppointments = await _context.Appointments
                .Where(a => a.TherapistId == therapistId
                    && a.Status != AppointmentStatus.Cancelled
                    && (excludeAppointmentId == null || a.Id != excludeAppointmentId)
                    && ((a.AppointmentDate < appointmentEnd && a.AppointmentDate.AddMinutes(a.DurationMinutes) > appointmentDate)))
                .AnyAsync();

            return !conflictingAppointments;
        }
    }
}
