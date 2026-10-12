using System.IO;
using System.Threading.Tasks;

namespace Application.Interfaces.Storage
{
	public interface IStorageService
	{
		Task<string> UploadAsync(Stream fileStream, string fileName, string? folder = null);
		Task DeleteAsync(string fileUrl);
	}
}
