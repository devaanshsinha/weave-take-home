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
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 md:px-8 lg:px-10">
        <Card className="rounded-[28px] px-6 py-8 md:px-8">
          <div className="mb-6 flex flex-wrap gap-2">
            <span className="h-4 w-4 rounded-full bg-chart-1" />
            <span className="h-4 w-4 rounded-full bg-chart-2" />
            <span className="h-4 w-4 rounded-full bg-chart-3" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Engineering impact snapshot
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
            PostHog Engineering Impact Dashboard
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
            This dashboard ranks engineers using a weighted blend of shipped work,
            ownership breadth, review leverage, and execution quality. It is based on a
            precomputed GitHub snapshot so reviewers are not blocked on live API fetches.
          </p>

          <div className="mt-6 grid gap-4 text-sm md:grid-cols-5">
            <div className="rounded-[20px] border border-border bg-muted/40 p-4">
              <p className="text-muted-foreground">Repository</p>
              <p className="mt-1 font-mono font-semibold text-foreground">{summary.repo}</p>
            </div>
            <div className="rounded-[20px] border border-border bg-muted/40 p-4">
              <p className="text-muted-foreground">Snapshot</p>
              <p className="mt-1 font-mono font-semibold text-foreground">
                {formatSnapshotDate(summary.generatedAt)}
              </p>
            </div>
            <div className="rounded-[20px] border border-border bg-muted/40 p-4">
              <p className="text-muted-foreground">Snapshot status</p>
              <p className="mt-1 font-mono font-semibold text-foreground">{dataCompleteness}</p>
            </div>
            <div className="rounded-[20px] border border-border bg-muted/40 p-4">
              <p className="text-muted-foreground">Merged PRs</p>
              <p className="mt-1 font-mono text-xl font-semibold text-foreground">
                {summary.mergedPrCount}
              </p>
            </div>
            <div className="rounded-[20px] border border-border bg-muted/40 p-4">
              <p className="text-muted-foreground">Ranked engineers</p>
              <p className="mt-1 font-mono text-xl font-semibold text-foreground">
                {summary.engineerCount}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <CardHeader>
            <Badge variant="coral">Methodology</Badge>
            <CardTitle className="mt-3">How the metric works</CardTitle>
          </CardHeader>
          <div className="mt-4 grid gap-4 text-sm text-muted-foreground md:grid-cols-5">
            <Card className="rounded-[18px] bg-muted/20 p-4">
              <p className="font-black text-foreground">Importance</p>
              <p className="mt-1">
                Rewards PRs that likely solved meaningful problems such as features, bugs,
                reliability, infra, performance, or customer-facing work.
              </p>
            </Card>
            <Card className="rounded-[18px] bg-muted/20 p-4">
              <p className="font-black text-foreground">Scope</p>
              <p className="mt-1">
                Uses changed files and cross-area reach to tell the difference between narrow
                edits and broad changes that move multiple parts of the system.
              </p>
            </Card>
            <Card className="rounded-[18px] bg-muted/20 p-4">
              <p className="font-black text-foreground">Complexity</p>
              <p className="mt-1">
                Looks for deeper review cycles, heavier discussions, refactors, migrations, and
                risky/shared areas as signals that a PR was harder to execute.
              </p>
            </Card>
            <Card className="rounded-[18px] bg-muted/20 p-4">
              <p className="font-black text-foreground">Quality</p>
              <p className="mt-1">
                Favors PRs that appear to land cleanly, including tests, review approvals, and
                fewer revert or hotfix-like signals.
              </p>
            </Card>
            <Card className="rounded-[18px] bg-muted/20 p-4">
              <p className="font-black text-foreground">Leverage</p>
              <p className="mt-1">
                Gives extra credit to shared infrastructure, enabling work, and changes that
                likely made the rest of the team faster.
              </p>
            </Card>
          </div>
          <p className="mt-4 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
            Each PR gets an inferred impact score from those five dimensions. Engineers are then
            ranked by average PR impact, number of high-impact PRs, ownership breadth, review
            leverage, and execution quality. Impact is inferred from GitHub signals, not direct
            performance evaluation.
          </p>
          {dataCompleteness !== "Full snapshot" ? (
            <p className="mt-3 text-xs leading-5 text-destructive">
              Current data status: {dataCompleteness}. Some dimensions may be understated until
              review and file enrichment is fully present in the snapshot.
            </p>
          ) : null}
        </Card>

        <section>
          <div className="mb-4">
            <Badge variant="mint">Top five</Badge>
            <h2 className="mt-3 text-2xl font-black text-foreground">Top 5 engineers</h2>
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
            <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
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
