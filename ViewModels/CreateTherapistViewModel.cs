using System.ComponentModel.DataAnnotations;

namespace PhysicalTherapyApp.ViewModels
{
    public class CreateTherapistViewModel
    {
        [Required(ErrorMessage = "El nombre completo es requerido")]
        [Display(Name = "Nombre Completo")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "El email es requerido")]
        [EmailAddress(ErrorMessage = "Email inválido")]
        public string Email { get; set; } = string.Empty;

        [Phone(ErrorMessage = "Teléfono inválido")]
        [Display(Name = "Teléfono")]
        public string? PhoneNumber { get; set; }

        [Required(ErrorMessage = "La contraseña es requerida")]
        [StringLength(100, ErrorMessage = "La {0} debe tener al menos {2} caracteres.", MinimumLength = 6)]
        [DataType(DataType.Password)]
        [Display(Name = "Contraseña")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "La especialización es requerida")]
        [Display(Name = "Especialización")]
        public string Specialization { get; set; } = string.Empty;

        [Display(Name = "Número de Licencia")]
        public string? LicenseNumber { get; set; }

        [Required(ErrorMessage = "Los años de experiencia son requeridos")]
        [Display(Name = "Años de Experiencia")]
        [Range(0, 50, ErrorMessage = "Debe estar entre 0 y 50 años")]
        public int YearsOfExperience { get; set; }

        [Display(Name = "Biografía")]
        [MaxLength(1000)]
        public string? Bio { get; set; }
    }
}
