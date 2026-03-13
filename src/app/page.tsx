import { EngineerBreakdown } from "@/components/engineer-breakdown";
import { EngineerCard } from "@/components/engineer-card";
import { EngineersTable } from "@/components/engineers-table";
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

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8 lg:px-10">
        <section className="rounded-3xl bg-slate-900 px-6 py-8 text-white shadow-sm md:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-300">
            Engineering impact
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            PostHog Engineering Impact Dashboard
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
            This dashboard ranks engineers using a weighted blend of shipped work,
            ownership breadth, review leverage, and execution quality. It is based on a
            precomputed GitHub snapshot so reviewers are not blocked on live API fetches.
          </p>

          <div className="mt-6 grid gap-4 text-sm md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-slate-400">Repository</p>
              <p className="mt-1 font-medium text-white">{summary.repo}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-slate-400">Snapshot</p>
              <p className="mt-1 font-medium text-white">
                {formatSnapshotDate(summary.generatedAt)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-slate-400">Merged PRs</p>
              <p className="mt-1 font-medium text-white">{summary.mergedPrCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-slate-400">Ranked engineers</p>
              <p className="mt-1 font-medium text-white">{summary.engineerCount}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">How the metric works</h2>
          <div className="mt-4 grid gap-4 text-sm text-slate-600 md:grid-cols-4">
            <div>
              <p className="font-medium text-slate-900">Shipped work</p>
              <p className="mt-1">Merged output, scaled to avoid rewarding raw volume alone.</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Ownership breadth</p>
              <p className="mt-1">Distinct top-level code areas touched across shipped work.</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Review leverage</p>
              <p className="mt-1">How much an engineer helps others move work forward.</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">Execution quality</p>
              <p className="mt-1">Merge rate and time-to-merge as pragmatic delivery signals.</p>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Top 5 engineers</h2>
            <p className="mt-1 text-sm text-slate-600">
              The most impactful engineers in the current snapshot, with short reasons for
              each ranking.
            </p>
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
