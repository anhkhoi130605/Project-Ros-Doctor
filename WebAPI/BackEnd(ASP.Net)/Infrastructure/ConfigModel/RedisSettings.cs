namespace Infrastructure.ConfigModel
{
	public class RedisSettings
	{
		private string _configuration = string.Empty;
		public string Configuration
		{
			get => !string.IsNullOrEmpty(_configuration) ? _configuration : ConnectionString;
			set => _configuration = value;
		}
		public string ConnectionString { get; set; } = string.Empty;
		public string InstanceName { get; set; } = string.Empty;
	}
}
