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
      <section className="rounded-2xl border border-dashed border-black/15 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Engineer breakdown</h2>
        <p className="mt-2 text-sm text-slate-600">
          Run <code>npm run fetch-data</code> to populate a data snapshot.
        </p>
      </section>
    );
  }

  const chartData = scoreLabels.map(({ key, label }) => ({
    label,
    value: engineer.subscores[key],
  }));

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Engineer breakdown</h2>
          <p className="mt-1 text-sm text-slate-600">
            A simple snapshot of the four weighted impact components.
          </p>
        </div>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span>Selected engineer</span>
          <select
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-slate-900"
            value={engineer.login}
            onChange={(event) => setSelectedLogin(event.target.value)}
          >
            {engineers.map((entry) => (
              <option key={entry.login} value={entry.login}>
                {entry.login}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="h-72 rounded-2xl border border-black/10 bg-slate-50 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 12, right: 8, left: -16, bottom: 12 }}>
              <CartesianGrid stroke="#dbe2ea" strokeDasharray="2 2" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#475569", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#475569", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "#e2e8f0" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid rgba(15, 23, 42, 0.1)",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.label}
                    fill={entry.label === "Shipped work" ? "#0f172a" : "#94a3b8"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Supporting metrics
          </h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600">Merged PRs</dt>
              <dd className="font-medium text-slate-900">
                {engineer.metrics.authoredMergedPrs}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600">Reviews given</dt>
              <dd className="font-medium text-slate-900">{engineer.metrics.reviewsGiven}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600">Merge rate</dt>
              <dd className="font-medium text-slate-900">{engineer.metrics.mergeRate}%</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600">Median time to merge</dt>
              <dd className="font-medium text-slate-900">
                {engineer.metrics.medianTimeToMergeHours}h
              </dd>
            </div>
            <div className="pt-2">
              <dt className="text-slate-600">Areas touched</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {engineer.metrics.distinctAreas.length > 0 ? (
                  engineer.metrics.distinctAreas.map((area) => (
                    <span
                      key={area}
                      className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
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
        </div>
      </div>
    </section>
  );
}
