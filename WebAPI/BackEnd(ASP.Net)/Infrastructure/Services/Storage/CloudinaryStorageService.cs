using System;
using System.IO;
using System.Threading.Tasks;
using Application.Interfaces.Storage;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Infrastructure.ConfigModel;
using Microsoft.Extensions.Options;

namespace Infrastructure.Services.Storage
{
	public class CloudinaryStorageService : IStorageService
	{
		private readonly Cloudinary _cloudinary;
		private readonly StorageSettings _storageSettings;

		public CloudinaryStorageService(
			IOptions<CloudinarySettings> cloudinaryOptions,
			IOptions<StorageSettings> storageOptions)
		{
			var settings = cloudinaryOptions.Value;
			var account = new Account(
				settings.CloudName,
				settings.ApiKey,
				settings.ApiSecret);

			_cloudinary = new Cloudinary(account);
			_cloudinary.Api.Secure = true;
			_storageSettings = storageOptions.Value;
		}

		public async Task<string> UploadAsync(Stream fileStream, string fileName, string? folder = null)
		{
			var targetFolder = folder ?? (!string.IsNullOrWhiteSpace(_storageSettings.BaseFolder) 
				? $"{_storageSettings.BaseFolder}/{_storageSettings.Avatars}".Trim('/') 
				: "avatars");

			var uploadParams = new ImageUploadParams
			{
				File = new FileDescription(fileName, fileStream),
				Folder = targetFolder,
				UseFilename = false,
				UniqueFilename = true,
				Overwrite = false
			};

			var uploadResult = await _cloudinary.UploadAsync(uploadParams);
			if (uploadResult.Error != null)
			{
				throw new InvalidOperationException($"Cloudinary upload failed: {uploadResult.Error.Message}");
			}

			return uploadResult.SecureUrl?.ToString() ?? uploadResult.Url?.ToString() ?? string.Empty;
		}

		public async Task DeleteAsync(string fileUrl)
		{
			if (string.IsNullOrWhiteSpace(fileUrl)) return;

			try
			{
				// Trích xuất publicId từ Cloudinary URL nếu khả dụng
				var uri = new Uri(fileUrl);
				var segments = uri.AbsolutePath.Split('/');
				if (segments.Length > 0)
				{
					var fileNameWithoutExt = Path.GetFileNameWithoutExtension(fileUrl);
					var deleteParams = new DeletionParams(fileNameWithoutExt);
					await _cloudinary.DestroyAsync(deleteParams);
				}
			}
			catch
			{
				// Nuốt ngoại lệ khi xóa ảnh cũ để không chặn luồng chính
			}
		}
	}
}
