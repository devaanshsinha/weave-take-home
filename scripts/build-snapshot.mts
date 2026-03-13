import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildEngineerRankings } from "../src/lib/scoring.ts";
import type { DashboardSummary, PullRequestRecord } from "../src/lib/types.ts";

const projectRoot = process.cwd();
const outputDir = path.join(projectRoot, "public", "data");
const prsPath = path.join(outputDir, "prs.json");
const engineersPath = path.join(outputDir, "engineers.json");
const summaryPath = path.join(outputDir, "summary.json");
const openedPrCountsPath = path.join(outputDir, "opened-pr-counts.json");

interface ExistingSummary {
  repo?: string;
  generatedAt?: string;
  cutoffDate?: string;
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const contents = await readFile(filePath, "utf8");
    return JSON.parse(contents) as T;
  } catch {
    return fallback;
  }
}

async function main(): Promise<void> {
  const pullRequests = await readJsonFile<PullRequestRecord[]>(prsPath, []);
  const authoredOpenedCounts = await readJsonFile<Record<string, number>>(
    openedPrCountsPath,
    {},
  );

  if (pullRequests.length === 0) {
    console.error("No PR snapshot found at public/data/prs.json");
    process.exitCode = 1;
    return;
  }

  const existingSummary = await readJsonFile<ExistingSummary>(summaryPath, {});
  const engineerRankings = buildEngineerRankings(pullRequests, {
    authoredOpenedCounts,
  });

  const summary: DashboardSummary = {
    repo: existingSummary.repo ?? "PostHog/posthog",
    generatedAt: new Date().toISOString(),
    cutoffDate: existingSummary.cutoffDate ?? "",
    engineerCount: engineerRankings.length,
    mergedPrCount: pullRequests.length,
    top5: engineerRankings.slice(0, 5),
    top10: engineerRankings.slice(0, 10),
  };

  await writeFile(engineersPath, `${JSON.stringify(engineerRankings, null, 2)}\n`, "utf8");
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

  console.log(`Ranked engineers written: ${engineerRankings.length}`);
  console.log(`Top 5 snapshot updated at: ${summary.generatedAt}`);
}

void main();
