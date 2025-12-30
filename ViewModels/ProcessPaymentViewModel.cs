using System.ComponentModel.DataAnnotations;

namespace PhysicalTherapyApp.ViewModels
{
    public class ProcessPaymentViewModel
    {
        public int AppointmentId { get; set; }
        
        public decimal Amount { get; set; }
        
        public string ServiceName { get; set; } = string.Empty;
        
        public string TherapistName { get; set; } = string.Empty;
        
        public DateTime AppointmentDate { get; set; }

        [Required(ErrorMessage = "Debe seleccionar un método de pago")]
        [Display(Name = "Método de Pago")]
        public string PaymentMethod { get; set; } = string.Empty;
    }
}
