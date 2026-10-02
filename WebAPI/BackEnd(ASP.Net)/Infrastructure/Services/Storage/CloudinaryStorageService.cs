using System.IO;
using System.Threading.Tasks;
using Application.Interfaces.Storage;

namespace Infrastructure.Services.Storage
{
	public class CloudinaryStorageService : IStorageService
	{
		public CloudinaryStorageService()
		{
		}

		public Task DeleteAsync(string fileUrl)
		{
			// TODO: implement actual delete logic with Cloudinary
			return Task.CompletedTask;
		}

		public Task<string> UploadAsync(Stream fileStream, string fileName)
		{
			// TODO: implement actual upload logic with Cloudinary
			return Task.FromResult(fileName);
		}
	}
}
