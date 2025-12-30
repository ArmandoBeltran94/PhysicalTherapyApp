using Microsoft.AspNetCore.Identity;

namespace PhysicalTherapyApp.Models
{
    public class ApplicationUser : IdentityUser
    {
        public string FullName { get; set; } = string.Empty;
        public new string? PhoneNumber { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Navigation properties
        public Patient? Patient { get; set; }
        public Therapist? Therapist { get; set; }
    }
}
