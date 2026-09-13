using System;
using System.IO;

namespace Domain.ConfigModel
{
	public class StorageSettings
	{
		public string BaseFolder { get; set; } = string.Empty;
		public string ImagesFolder { get; set; } = string.Empty;
		public string VideosFolder { get; set; } = string.Empty;
		public string AudioFolder { get; set; } = string.Empty;
		public string DocumentsFolder { get; set; } = string.Empty;
		public string TextsFolder { get; set; } = string.Empty;
		public string ArchivesFolder { get; set; } = string.Empty;
		public string FilesFolder { get; set; } = string.Empty;
		public string Avatars { get; set; } = string.Empty;
		public string Certificates { get; set; } = string.Empty;
		public string Materials { get; set; } = string.Empty;
		public string IdentityDocuments { get; set; } = string.Empty;

		public string GetPath(params string[] parts)
		{
			var total = 1 + (parts?.Length ?? 0);
			var arr = new string[total];
			arr[0] = string.IsNullOrWhiteSpace(BaseFolder) ? string.Empty : BaseFolder;
			if (parts != null && parts.Length > 0)
				Array.Copy(parts, 0, arr, 1, parts.Length);

			return Path.Combine(arr);
		}
	}
}
