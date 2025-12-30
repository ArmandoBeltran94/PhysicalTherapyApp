using System.ComponentModel.DataAnnotations;

namespace PhysicalTherapyApp.Models
{
    public class Appointment
    {
        public int Id { get; set; }
        
        [Required]
        public int PatientId { get; set; }
        
        [Required]
        public int TherapistId { get; set; }
        
        [Required]
        public int ServiceId { get; set; }
        
        [Required]
        public DateTime AppointmentDate { get; set; }
        
        public int DurationMinutes { get; set; }
        
        public AppointmentStatus Status { get; set; } = AppointmentStatus.Pending;
        
        [MaxLength(500)]
        public string? Notes { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation properties
        public Patient Patient { get; set; } = null!;
        public Therapist Therapist { get; set; } = null!;
        public Service Service { get; set; } = null!;
        public Payment? Payment { get; set; }
    }
}
