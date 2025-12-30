using System.ComponentModel.DataAnnotations;

namespace PhysicalTherapyApp.ViewModels
{
    public class CreateAppointmentViewModel
    {
        [Required(ErrorMessage = "Debe seleccionar un terapeuta")]
        [Display(Name = "Terapeuta")]
        public int TherapistId { get; set; }

        [Required(ErrorMessage = "Debe seleccionar un servicio")]
        [Display(Name = "Servicio")]
        public int ServiceId { get; set; }

        [Required(ErrorMessage = "Debe seleccionar una fecha y hora")]
        [Display(Name = "Fecha y Hora")]
        public DateTime AppointmentDate { get; set; }

        [Display(Name = "Notas")]
        [MaxLength(500)]
        public string? Notes { get; set; }
    }
}
