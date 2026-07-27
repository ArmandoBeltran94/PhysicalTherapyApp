using System.ComponentModel.DataAnnotations;

namespace PhysicalTherapyApp.Models
{
    public class AppointmentRequest
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string PatientName { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string PhoneNumber { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Notes { get; set; }

        public string Status { get; set; } = "Pending"; // Pending, Processed

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
