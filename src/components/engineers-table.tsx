import type { EngineerScoreBreakdown } from "@/lib/types";

interface EngineersTableProps {
  engineers: EngineerScoreBreakdown[];
}

export function EngineersTable({ engineers }: EngineersTableProps) {
  if (engineers.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-black/15 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Top 10 engineers</h2>
        <p className="mt-2 text-sm text-slate-600">
          No ranked engineers yet. Generate a snapshot to populate this table.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Top 10 engineers</h2>
        <p className="mt-1 text-sm text-slate-600">
          Supporting leaderboard with score components and operating metrics.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-3 font-medium">Engineer</th>
              <th className="px-3 py-3 font-medium">Score</th>
              <th className="px-3 py-3 font-medium">Shipped</th>
              <th className="px-3 py-3 font-medium">Breadth</th>
              <th className="px-3 py-3 font-medium">Review</th>
              <th className="px-3 py-3 font-medium">Execution</th>
              <th className="px-3 py-3 font-medium">Merged PRs</th>
              <th className="px-3 py-3 font-medium">Reviews</th>
            </tr>
          </thead>
          <tbody>
            {engineers.map((engineer) => (
              <tr key={engineer.login} className="border-b border-black/5 last:border-b-0">
                <td className="px-3 py-3 font-medium text-slate-900">{engineer.login}</td>
                <td className="px-3 py-3 text-slate-900">{engineer.finalScore}</td>
                <td className="px-3 py-3 text-slate-600">{engineer.subscores.shipped_work}</td>
                <td className="px-3 py-3 text-slate-600">
                  {engineer.subscores.ownership_breadth}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {engineer.subscores.review_leverage}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {engineer.subscores.execution_quality}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {engineer.metrics.authoredMergedPrs}
                </td>
                <td className="px-3 py-3 text-slate-600">{engineer.metrics.reviewsGiven}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
