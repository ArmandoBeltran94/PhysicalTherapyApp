using System.ComponentModel.DataAnnotations;

namespace PhysicalTherapyApp.ViewModels
{
    public class UpdateUserViewModel
    {
        [Required]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Phone]
        public string? PhoneNumber { get; set; }
        
        public string? Password { get; set; }
    }
}
