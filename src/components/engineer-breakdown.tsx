"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import type { EngineerScoreBreakdown } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

interface EngineerBreakdownProps {
  engineers: EngineerScoreBreakdown[];
}

const scoreLabels = [
  { key: "shipped_work", label: "Shipped work" },
  { key: "ownership_breadth", label: "Ownership breadth" },
  { key: "review_leverage", label: "Review leverage" },
  { key: "execution_quality", label: "Execution quality" },
] as const;

const EngineerScoreChart = dynamic(
  () => import("@/components/engineer-score-chart").then((mod) => mod.EngineerScoreChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-[14px] border border-dashed border-black/20 text-sm text-slate-500">
        Loading chart...
      </div>
    ),
  },
);

export function EngineerBreakdown({ engineers }: EngineerBreakdownProps) {
  const [selectedLogin, setSelectedLogin] = useState(engineers[0]?.login ?? "");
  const engineer =
    engineers.find((entry) => entry.login === selectedLogin) ?? engineers[0] ?? null;

  if (!engineer) {
    return (
      <Card className="border-dashed p-6">
        <CardTitle className="text-lg">Engineer breakdown</CardTitle>
        <CardDescription className="mt-2">
          Run <code>npm run fetch-data</code> to populate a data snapshot.
        </CardDescription>
      </Card>
    );
  }

  const chartData = scoreLabels.map(({ key, label }) => ({
    label,
    value: engineer.subscores[key],
  }));

  return (
    <Card className="p-6">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Badge variant="blue">Drill down</Badge>
          <CardTitle className="mt-3">Engineer breakdown</CardTitle>
          <CardDescription className="mt-1">
            A simple snapshot of the four weighted impact components.
          </CardDescription>
        </div>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-medium uppercase tracking-[0.12em]">Selected engineer</span>
          <Select
            value={engineer.login}
            onChange={(event) => setSelectedLogin(event.target.value)}
          >
            {engineers.map((entry) => (
              <option key={entry.login} value={entry.login}>
                {entry.login}
              </option>
            ))}
          </Select>
        </label>
      </CardHeader>

      <CardContent className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <Card className="h-80 rounded-[20px] p-3">
          <EngineerScoreChart data={chartData} />
        </Card>

        <Card className="rounded-[20px] bg-[#ffd84d] p-4">
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-black">
            Supporting metrics
          </h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-800">Avg PR impact</dt>
              <dd className="font-mono font-semibold text-slate-900">
                {engineer.metrics.averagePrImpactScore}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-800">High-impact PRs</dt>
              <dd className="font-mono font-semibold text-slate-900">
                {engineer.metrics.highImpactPrs}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-800">Impact consistency</dt>
              <dd className="font-mono font-semibold text-slate-900">
                {engineer.metrics.impactConsistency}%
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-800">Merged PRs</dt>
              <dd className="font-mono font-semibold text-slate-900">
                {engineer.metrics.authoredMergedPrs}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-800">Reviews given</dt>
              <dd className="font-mono font-semibold text-slate-900">{engineer.metrics.reviewsGiven}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-800">Merge rate</dt>
              <dd className="font-mono font-semibold text-slate-900">{engineer.metrics.mergeRate}%</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-800">Median time to merge</dt>
              <dd className="font-mono font-semibold text-slate-900">
                {engineer.metrics.medianTimeToMergeHours}h
              </dd>
            </div>
            <div className="pt-2">
              <dt className="text-slate-800">Areas touched</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {engineer.metrics.distinctAreas.length > 0 ? (
                  engineer.metrics.distinctAreas.map((area) => (
                    <span
                      key={area}
                      className="rounded-full border border-black bg-[#fff7d6] px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      {area}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500">Not enriched yet</span>
                )}
              </dd>
            </div>
          </dl>
        </Card>
      </CardContent>
    </Card>
  );
}
