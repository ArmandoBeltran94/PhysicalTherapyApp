using System.ComponentModel.DataAnnotations;

namespace PhysicalTherapyApp.ViewModels
{
    public class UpdateTherapistViewModel
    {
        [Required]
        public string FullName { get; set; } = string.Empty;

        [Required]
        public string Specialization { get; set; } = string.Empty;

        public string? LicenseNumber { get; set; }

        public int YearsOfExperience { get; set; }

        public string? Bio { get; set; }
    }
}
