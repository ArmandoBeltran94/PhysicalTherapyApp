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
            var nextDate = dateOnly.AddDays(1);

            // Cargar citas del día en memoria para evitar problemas de traducción de SQLite con AddMinutes
            var dailyAppointments = await _context.Appointments
                .Where(a => a.TherapistId == therapistId
                    && a.Status != AppointmentStatus.Cancelled
                    && a.AppointmentDate >= dateOnly
                    && a.AppointmentDate < nextDate)
                .ToListAsync();

            for (int hour = startHour; hour < endHour; hour++)
            {
                for (int minute = 0; minute < 60; minute += 30)
                {
                    var slotStart = dateOnly.AddHours(hour).AddMinutes(minute);
                    var slotEnd = slotStart.AddMinutes(durationMinutes);

                    var hasConflict = dailyAppointments.Any(a =>
                    {
                        var aStart = a.AppointmentDate;
                        var aEnd = a.AppointmentDate.AddMinutes(a.DurationMinutes);
                        return aStart < slotEnd && aEnd > slotStart;
                    });

                    // Si la fecha es de hoy, asegurar que el horario sea en el futuro
                    if (!hasConflict && slotStart > DateTime.Now)
                    {
                        availableSlots.Add(slotStart);
                    }
                    else if (!hasConflict && dateOnly > DateTime.Now.Date)
                    {
                        availableSlots.Add(slotStart);
                    }
                }
            }

            return availableSlots;
        }

        public async Task<bool> IsTimeSlotAvailableAsync(int therapistId, DateTime appointmentDate, int durationMinutes, int? excludeAppointmentId = null)
        {
            var appointmentEnd = appointmentDate.AddMinutes(durationMinutes);
            var dateOnly = appointmentDate.Date;
            var nextDate = dateOnly.AddDays(1);

            var dailyAppointments = await _context.Appointments
                .Where(a => a.TherapistId == therapistId
                    && a.Status != AppointmentStatus.Cancelled
                    && (excludeAppointmentId == null || a.Id != excludeAppointmentId)
                    && a.AppointmentDate >= dateOnly
                    && a.AppointmentDate < nextDate)
                .ToListAsync();

            var hasConflict = dailyAppointments.Any(a =>
            {
                var aStart = a.AppointmentDate;
                var aEnd = a.AppointmentDate.AddMinutes(a.DurationMinutes);
                return aStart < appointmentEnd && aEnd > appointmentDate;
            });

            return !hasConflict;
        }
    }
}
