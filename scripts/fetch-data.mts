import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatIsoDate, getCutoffDate } from "../src/lib/format.ts";

const REPO_OWNER = "PostHog";
const REPO_NAME = "posthog";
const WINDOW_DAYS = 90;

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const projectRoot = path.resolve(currentDir, "..");
const outputDir = path.join(projectRoot, "public", "data");

async function main(): Promise<void> {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.error("Missing GITHUB_TOKEN in environment.");
    process.exitCode = 1;
    return;
  }

  const cutoffDate = getCutoffDate(WINDOW_DAYS);

  await mkdir(outputDir, { recursive: true });

  console.log(`Repository: ${REPO_OWNER}/${REPO_NAME}`);
  console.log(`Window: last ${WINDOW_DAYS} days`);
  console.log(`Cutoff: ${formatIsoDate(cutoffDate)}`);
  console.log(`Output directory: ${outputDir}`);
  console.log("Scaffold ready. Next step is wiring GitHub API fetching.");
}

void main();
