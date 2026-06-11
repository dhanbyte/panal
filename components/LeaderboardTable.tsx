import { formatTime } from '@/lib/utils';
import type { LeaderboardRow } from '@/lib/types';

interface LeaderboardTableProps {
  rows: LeaderboardRow[];
}

export default function LeaderboardTable({ rows }: LeaderboardTableProps) {
  if (rows.length === 0) {
    return <div className="py-10 text-center text-sm text-gray-600">No leaderboard data yet.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
            <th className="px-3 py-2">Rank</th>
            <th className="px-3 py-2">Member</th>
            <th className="px-3 py-2">Completed</th>
            <th className="px-3 py-2">Assigned</th>
            <th className="px-3 py-2">Avg Time</th>
            <th className="px-3 py-2">Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.user_id} className="border-b border-gray-100">
              <td className="px-3 py-2 font-semibold text-gray-900">#{index + 1}</td>
              <td className="px-3 py-2 text-gray-800">{row.name}</td>
              <td className="px-3 py-2">{row.tasks_completed}</td>
              <td className="px-3 py-2">{row.tasks_assigned}</td>
              <td className="px-3 py-2">{formatTime(row.avg_completion_time)}</td>
              <td className="px-3 py-2">
                <span className="rounded bg-blue-100 px-2 py-1 font-semibold text-blue-700">{row.score}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
