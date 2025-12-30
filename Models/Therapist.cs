using System.ComponentModel.DataAnnotations;

namespace PhysicalTherapyApp.Models
{
    public class Therapist
    {
        public int Id { get; set; }
        
        [Required]
        public string UserId { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(200)]
        public string Specialization { get; set; } = string.Empty;
        
        [MaxLength(100)]
        public string? LicenseNumber { get; set; }
        
        public int YearsOfExperience { get; set; }
        
        [MaxLength(1000)]
        public string? Bio { get; set; }
        
        public bool IsAvailable { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public ApplicationUser User { get; set; } = null!;
        public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    }
}
