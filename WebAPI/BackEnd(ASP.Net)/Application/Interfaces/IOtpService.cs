using System.Threading.Tasks;

namespace Application.Interfaces
{
	public interface IOtpService
	{
		Task<string> GenerateAndSaveOtpAsync(string target);
		Task<bool> ValidateOtpAsync(string target, string code);
	}
}
