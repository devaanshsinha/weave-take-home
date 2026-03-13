import { EngineerBreakdown } from "@/components/engineer-breakdown";
import { EngineerCard } from "@/components/engineer-card";
import { EngineersTable } from "@/components/engineers-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardData } from "@/lib/dashboard-data";

function formatSnapshotDate(value: string): string {
  if (!value) {
    return "No snapshot generated yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function Home() {
  const { summary, engineers } = await getDashboardData();
  const topFive = summary.top5.length > 0 ? summary.top5 : engineers.slice(0, 5);
  const topTen = summary.top10.length > 0 ? summary.top10 : engineers.slice(0, 10);
  const hasAreaData = engineers.some((engineer) => engineer.metrics.distinctAreas.length > 0);
  const hasReviewData = engineers.some((engineer) => engineer.metrics.reviewsGiven > 0);
  const dataCompleteness =
    hasAreaData && hasReviewData
      ? "Full snapshot"
      : hasAreaData || hasReviewData
        ? "Partially enriched snapshot"
        : "PR-only snapshot";

  return (
    <main className="min-h-screen bg-stone-50 text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8 lg:px-10">
        <Card className="rounded-[28px] px-6 py-8 text-black md:px-8">
          <div className="mb-6 flex flex-wrap gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-black bg-[#ff7a59]" />
            <span className="h-4 w-4 rounded-full border-2 border-black bg-[#ffd84d]" />
            <span className="h-4 w-4 rounded-full border-2 border-black bg-[#74d3ae]" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-700">
            Engineering impact snapshot
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
            PostHog Engineering Impact Dashboard
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-700 md:text-base">
            This dashboard ranks engineers using a weighted blend of shipped work,
            ownership breadth, review leverage, and execution quality. It is based on a
            precomputed GitHub snapshot so reviewers are not blocked on live API fetches.
          </p>

          <div className="mt-6 grid gap-4 text-sm md:grid-cols-5">
            <div className="rounded-[20px] border-2 border-black bg-[#77aaff] p-4">
              <p className="text-slate-800">Repository</p>
              <p className="mt-1 font-mono font-semibold text-black">{summary.repo}</p>
            </div>
            <div className="rounded-[20px] border-2 border-black bg-[#ffd84d] p-4">
              <p className="text-slate-800">Snapshot</p>
              <p className="mt-1 font-mono font-semibold text-black">
                {formatSnapshotDate(summary.generatedAt)}
              </p>
            </div>
            <div className="rounded-[20px] border-2 border-black bg-[#74d3ae] p-4">
              <p className="text-slate-800">Snapshot status</p>
              <p className="mt-1 font-mono font-semibold text-black">{dataCompleteness}</p>
            </div>
            <div className="rounded-[20px] border-2 border-black bg-[#ff7a59] p-4">
              <p className="text-slate-800">Merged PRs</p>
              <p className="mt-1 font-mono text-xl font-semibold text-black">{summary.mergedPrCount}</p>
            </div>
            <div className="rounded-[20px] border-2 border-black bg-[#f4a6ff] p-4">
              <p className="text-slate-800">Ranked engineers</p>
              <p className="mt-1 font-mono text-xl font-semibold text-black">{summary.engineerCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <CardHeader>
            <Badge variant="coral">Methodology</Badge>
            <CardTitle className="mt-3">How the metric works</CardTitle>
          </CardHeader>
          <div className="mt-4 grid gap-4 text-sm text-slate-600 md:grid-cols-4">
            <Card className="rounded-[18px] p-4">
              <p className="font-black text-slate-900">Shipped work</p>
              <p className="mt-1">
                Weighted from merged PR count, code churn, and changed files with log scaling
                so one giant PR does not dominate.
              </p>
            </Card>
            <Card className="rounded-[18px] p-4">
              <p className="font-black text-slate-900">Ownership breadth</p>
              <p className="mt-1">
                Counts distinct top-level code areas inferred from file paths rather than raw
                file totals.
              </p>
            </Card>
            <Card className="rounded-[18px] p-4">
              <p className="font-black text-slate-900">Review leverage</p>
              <p className="mt-1">
                Rewards reviewers who help peers move work forward instead of looking only at
                authored output.
              </p>
            </Card>
            <Card className="rounded-[18px] p-4">
              <p className="font-black text-slate-900">Execution quality</p>
              <p className="mt-1">
                Uses merge rate and median time to merge as pragmatic delivery signals, not as
                absolute performance measures.
              </p>
            </Card>
          </div>
          <p className="mt-4 border-t border-black/10 pt-4 text-xs leading-5 text-slate-500">
            Impact is inferred from GitHub collaboration signals, not direct performance
            evaluation. Snapshot data is precomputed for speed and reliability.
          </p>
          {dataCompleteness !== "Full snapshot" ? (
            <p className="mt-3 text-xs leading-5 text-amber-700">
              Current data status: {dataCompleteness}. Some dimensions may be understated until
              review and file enrichment is fully present in the snapshot.
            </p>
          ) : null}
        </Card>

        <section>
          <div className="mb-4">
            <Badge variant="mint">Top five</Badge>
            <h2 className="mt-3 text-2xl font-black text-slate-900">Top 5 engineers</h2>
            <CardDescription className="mt-1">
              The most impactful engineers in the current snapshot, with short reasons for
              each ranking.
            </CardDescription>
          </div>

          {topFive.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {topFive.map((engineer, index) => (
                <EngineerCard key={engineer.login} engineer={engineer} rank={index + 1} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white p-6 text-sm text-slate-600">
              No snapshot data yet. Once <code>npm run fetch-data</code> succeeds, this
              section will populate automatically.
            </div>
          )}
        </section>

        <EngineerBreakdown engineers={engineers} />

        <EngineersTable engineers={topTen} />
      </div>
    </main>
  );
}
