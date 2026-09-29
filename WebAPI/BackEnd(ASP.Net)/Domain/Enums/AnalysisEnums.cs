namespace Domain.Enums
{
	public enum SessionResultCode
	{
		SUCCESS,
		WARNING,
		ERROR
	}

	public enum SessionStatus
	{
		Processing,
		PendingReview,
		Complete
	}

	public enum IssueSeverity
	{
		HIGH,
		MEDIUM,
		LOW
	}

	public enum ReviewStatus
	{
		Pending,
		Approved,
		Rejected,
		ChangesNeeded
	}

	public enum ReportStatus
	{
		Pending,
		Approved,
		Published
	}

	public enum ChatSender
	{
		USER,
		AGENT
	}
}
