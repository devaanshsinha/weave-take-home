"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  const chartColors = ["#ff7a59", "#ffd84d", "#74d3ae", "#77aaff"];

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
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 12, right: 8, left: -16, bottom: 12 }}>
              <CartesianGrid stroke="#d1c6aa" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#111111", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#111111", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "#f3ecdc" }}
                contentStyle={{
                  borderRadius: 18,
                  border: "2px solid #111111",
                  boxShadow: "none",
                  backgroundColor: "#fffdf7",
                }}
              />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.label}
                    fill={chartColors[index % chartColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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
