using PhysicalTherapyApp.Models;

namespace PhysicalTherapyApp.ViewModels
{
    public class AdminDashboardViewModel
    {
        public int TotalPatients { get; set; }
        public int TotalTherapists { get; set; }
        public int TotalAppointments { get; set; }
        public int PendingAppointments { get; set; }
        public decimal TotalRevenue { get; set; }
        public List<Appointment> RecentAppointments { get; set; } = new();
    }
}
