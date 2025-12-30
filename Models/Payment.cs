using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PhysicalTherapyApp.Models
{
    public class Payment
    {
        public int Id { get; set; }
        
        [Required]
        public int AppointmentId { get; set; }
        
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string PaymentMethod { get; set; } = string.Empty;
        
        public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
        
        [MaxLength(200)]
        public string? TransactionId { get; set; }
        
        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
        
        [MaxLength(500)]
        public string? Notes { get; set; }
        
        // Navigation properties
        public Appointment Appointment { get; set; } = null!;
    }
}
