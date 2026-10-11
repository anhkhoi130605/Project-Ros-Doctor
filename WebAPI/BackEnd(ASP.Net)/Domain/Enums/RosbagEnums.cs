namespace Domain.Enums
{
	public enum RosbagReviewStatus
	{
		Draft,
		Submitted,
		Approved,
		Rejected
	}

	public enum RosbagFormat
	{
		MCAP,
		SQLite3,
		ZIP
	}

	public enum RosbagStatus
	{
		Ready,
		Complete,
		Invalid,
		Processing
	}
}
