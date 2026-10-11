// Match the exact rosbag ID, never the filename: different uploads can share a name.
// /api/bags supplies the latest analysis session for each bag.
export function attachSubmissionSessions(submissions, bags) {
  const sessionIds = new Map(bags.map(bag => [bag.id, bag.sessionId]));
  return submissions.map(entry => ({
    ...entry,
    sessionId: entry.reviewStatus === 'Approved'
      ? sessionIds.get(entry.id) || null
      : null,
  }));
}
