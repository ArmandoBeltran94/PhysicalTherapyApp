using System.ComponentModel.DataAnnotations;

namespace PhysicalTherapyApp.ViewModels
{
    public class UpdateProfileViewModel
    {
        [Required]
        public string FullName { get; set; } = string.Empty;

        [Phone]
        public string? PhoneNumber { get; set; }

        public string? CurrentPassword { get; set; }
        
        public string? NewPassword { get; set; }
    }
}
