import { readFile } from "node:fs/promises";
import path from "node:path";

import type { DashboardSummary, EngineerScoreBreakdown } from "@/lib/types";

const publicDataPath = path.join(process.cwd(), "public", "data");

const emptySummary: DashboardSummary = {
  repo: "PostHog/posthog",
  generatedAt: "",
  cutoffDate: "",
  engineerCount: 0,
  mergedPrCount: 0,
  top5: [],
  top10: [],
};

async function readJsonFile<T>(fileName: string, fallback: T): Promise<T> {
  try {
    const filePath = path.join(publicDataPath, fileName);
    const contents = await readFile(filePath, "utf8");
    return JSON.parse(contents) as T;
  } catch {
    return fallback;
  }
}

function normalizeEngineer(engineer: Partial<EngineerScoreBreakdown>): EngineerScoreBreakdown {
  return {
    login: engineer.login ?? "unknown",
    finalScore: engineer.finalScore ?? 0,
    reasons: engineer.reasons ?? [],
    rawScores: {
      shippedWork: engineer.rawScores?.shippedWork ?? 0,
      ownershipBreadth: engineer.rawScores?.ownershipBreadth ?? 0,
      reviewLeverage: engineer.rawScores?.reviewLeverage ?? 0,
      executionQuality: engineer.rawScores?.executionQuality ?? 0,
    },
    metrics: {
      authoredMergedPrs: engineer.metrics?.authoredMergedPrs ?? 0,
      authoredOpenedPrs: engineer.metrics?.authoredOpenedPrs ?? 0,
      reviewsGiven: engineer.metrics?.reviewsGiven ?? 0,
      distinctAreas: engineer.metrics?.distinctAreas ?? [],
      mergeRate: engineer.metrics?.mergeRate ?? 0,
      medianTimeToMergeHours: engineer.metrics?.medianTimeToMergeHours ?? 0,
      averagePrImpactScore: engineer.metrics?.averagePrImpactScore ?? 0,
      highImpactPrs: engineer.metrics?.highImpactPrs ?? 0,
      impactConsistency: engineer.metrics?.impactConsistency ?? 0,
    },
    subscores: {
      shipped_work: engineer.subscores?.shipped_work ?? 0,
      ownership_breadth: engineer.subscores?.ownership_breadth ?? 0,
      review_leverage: engineer.subscores?.review_leverage ?? 0,
      execution_quality: engineer.subscores?.execution_quality ?? 0,
    },
  };
}

function normalizeSummary(summary: Partial<DashboardSummary>): DashboardSummary {
  return {
    repo: summary.repo ?? emptySummary.repo,
    generatedAt: summary.generatedAt ?? "",
    cutoffDate: summary.cutoffDate ?? "",
    engineerCount: summary.engineerCount ?? 0,
    mergedPrCount: summary.mergedPrCount ?? 0,
    top5: (summary.top5 ?? []).map(normalizeEngineer),
    top10: (summary.top10 ?? []).map(normalizeEngineer),
  };
}

export async function getDashboardData(): Promise<{
  summary: DashboardSummary;
  engineers: EngineerScoreBreakdown[];
}> {
  const [rawSummary, rawEngineers] = await Promise.all([
    readJsonFile<Partial<DashboardSummary>>("summary.json", emptySummary),
    readJsonFile<Array<Partial<EngineerScoreBreakdown>>>("engineers.json", []),
  ]);

  return {
    summary: normalizeSummary(rawSummary),
    engineers: rawEngineers.map(normalizeEngineer),
  };
}
