import type {
  EngineerRawMetrics,
  EngineerRawScoreComponents,
  EngineerScoreBreakdown,
  EngineerSubscores,
  PullRequestRecord,
  RankingWeights,
} from "./types.ts";

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  shippedWork: 0.4,
  ownershipBreadth: 0.25,
  reviewLeverage: 0.2,
  executionQuality: 0.15,
};

export function normalize(values: number[]): number[] {
  if (values.length === 0) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    return values.map((value) => (value === 0 ? 0 : 100));
  }

  return values.map((value) => ((value - min) / (max - min)) * 100);
}

export function logScale(value: number): number {
  return Math.log1p(Math.max(0, value));
}

export function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

export function deriveTopLevelArea(path: string): string {
  const normalizedPath = path.replace(/^\.\//, "");
  const [topLevel] = normalizedPath.split("/");

  if (!topLevel || topLevel.length === 0) {
    return "repo-meta";
  }

  const docsLike = new Set([
    "docs",
    "README.md",
    "CLAUDE.md",
    "AGENTS.md",
  ]);
  if (docsLike.has(topLevel)) {
    return "docs";
  }

  const infraLike = new Set([
    ".github",
    ".devcontainer",
    ".config",
    ".vscode",
    ".claude",
    ".agents",
    ".flox",
    ".semgrep",
    ".husky",
    "Dockerfile",
    "Dockerfile.ai-evals",
    "docker-compose.base.yml",
    "docker-compose.dev-coordinator.yml",
    "docker-compose.dev-full.yml",
    "docker-compose.dev-minimal.yml",
    "docker-compose.dev.yml",
    "docker-compose.hobby.yml",
    "docker-compose.profiles.yml",
    "bin",
    "devenv",
    "playwright",
    "share",
    "tools",
  ]);
  if (infraLike.has(topLevel)) {
    return "infra";
  }

  const toolingLike = new Set([
    ".gitignore",
    ".prettierignore",
    ".stylelintignore",
    ".watchmanconfig",
    ".env.example",
    ".oxfmtrc.json",
    ".oxlintrc.json",
    ".test_durations",
    "greptile.json",
    "mypy-baseline.txt",
    "mypy.ini",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "pyproject.toml",
    "tach.toml",
    "test-runner-jest-environment.js",
    "test-snapshot-resolver.js",
    "tsconfig.json",
    "turbo.json",
    "uv.lock",
  ]);
  if (toolingLike.has(topLevel)) {
    return "tooling";
  }

  const productAreas = new Set([
    "frontend",
    "products",
    "posthog",
    "services",
    "common",
    "ee",
    "rust",
    "nodejs",
    "cli",
    "livestream",
  ]);
  if (productAreas.has(topLevel)) {
    return topLevel;
  }

  return "repo-meta";
}

export function isBotLogin(login: string): boolean {
  return login.endsWith("[bot]");
}

export function roundTo(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getMergeTimeHours(createdAt: string, mergedAt: string): number {
  const createdMs = new Date(createdAt).getTime();
  const mergedMs = new Date(mergedAt).getTime();

  if (Number.isNaN(createdMs) || Number.isNaN(mergedMs) || mergedMs < createdMs) {
    return 0;
  }

  return (mergedMs - createdMs) / (1000 * 60 * 60);
}

export function buildEngineerMetrics(pullRequests: PullRequestRecord[]): EngineerRawMetrics[] {
  return buildEngineerMetricsWithOpenedCounts(pullRequests, {});
}

export function buildEngineerMetricsWithOpenedCounts(
  pullRequests: PullRequestRecord[],
  authoredOpenedCounts: Record<string, number>,
): EngineerRawMetrics[] {
  const engineers = new Map<string, EngineerRawMetrics>();
  const reviewCounts = new Map<string, number>();

  for (const pullRequest of pullRequests) {
    const existing = engineers.get(pullRequest.author);
    const current =
      existing ??
      ({
        login: pullRequest.author,
        authoredMergedPrs: 0,
        authoredOpenedPrs: authoredOpenedCounts[pullRequest.author] ?? 0,
        reviewsGiven: 0,
        totalAdditions: 0,
        totalDeletions: 0,
        totalChangedFiles: 0,
        distinctAreas: [],
        mergeTimeHours: [],
        prImpactScores: [],
        prLandingQualityScores: [],
        prMergeSpeedScores: [],
      } satisfies EngineerRawMetrics);

    current.authoredMergedPrs += 1;
    current.totalAdditions += pullRequest.additions;
    current.totalDeletions += pullRequest.deletions;
    current.totalChangedFiles += pullRequest.changedFiles;
    current.mergeTimeHours.push(getMergeTimeHours(pullRequest.createdAt, pullRequest.mergedAt));
    current.prImpactScores.push(computePrImpactScore(pullRequest));
    current.prLandingQualityScores.push(scoreLandingQuality(pullRequest));
    current.prMergeSpeedScores.push(scoreMergeSpeed(pullRequest));

    const derivedAreas =
      pullRequest.files.length > 0
        ? [...new Set(pullRequest.files.map((file) => deriveTopLevelArea(file.path)))]
        : pullRequest.topLevelAreas;
    const allAreas = new Set([...current.distinctAreas, ...derivedAreas]);
    current.distinctAreas = [...allAreas].sort();

    engineers.set(pullRequest.author, current);

    for (const review of pullRequest.reviews) {
      if (review.author === pullRequest.author || isBotLogin(review.author)) {
        continue;
      }

      reviewCounts.set(review.author, (reviewCounts.get(review.author) ?? 0) + 1);
    }
  }

  for (const [login, count] of reviewCounts.entries()) {
    const existing = engineers.get(login);

    if (existing) {
      existing.reviewsGiven = count;
      continue;
    }

    engineers.set(login, {
      login,
      authoredMergedPrs: 0,
      authoredOpenedPrs: authoredOpenedCounts[login] ?? 0,
      reviewsGiven: count,
      totalAdditions: 0,
      totalDeletions: 0,
      totalChangedFiles: 0,
      distinctAreas: [],
      mergeTimeHours: [],
      prImpactScores: [],
      prLandingQualityScores: [],
      prMergeSpeedScores: [],
    });
  }

  for (const [login, authoredOpenedPrs] of Object.entries(authoredOpenedCounts)) {
    const existing = engineers.get(login);

    if (existing) {
      existing.authoredOpenedPrs = authoredOpenedPrs;
      continue;
    }

    engineers.set(login, {
      login,
      authoredMergedPrs: 0,
      authoredOpenedPrs,
      reviewsGiven: 0,
      totalAdditions: 0,
      totalDeletions: 0,
      totalChangedFiles: 0,
      distinctAreas: [],
      mergeTimeHours: [],
      prImpactScores: [],
      prLandingQualityScores: [],
      prMergeSpeedScores: [],
    });
  }

  return [...engineers.values()];
}

export function computeRawScoreComponents(
  engineers: EngineerRawMetrics[],
): EngineerRawScoreComponents[] {
  return engineers.map((engineer) => {
    const averagePrImpact = average(engineer.prImpactScores);
    const highImpactPrs = engineer.prImpactScores.filter((score) => score >= 500).length;
    const impactConsistency =
      engineer.prImpactScores.length > 0
        ? engineer.prImpactScores.filter((score) => score >= averagePrImpact).length /
          engineer.prImpactScores.length
        : 0;

    const shippedWork =
      logScale(averagePrImpact) * 1.4 +
      logScale(highImpactPrs) +
      impactConsistency * 2;

    const ownershipBreadth =
      engineer.distinctAreas.length > 0 ? logScale(engineer.distinctAreas.length) : 0;

    const reviewLeverage = logScale(engineer.reviewsGiven);

    const mergeRate =
      engineer.authoredOpenedPrs > 0
        ? engineer.authoredMergedPrs / engineer.authoredOpenedPrs
        : 0;
    const mergeReliability = mergeRate * 100;
    const landingQuality = average(engineer.prLandingQualityScores);
    const mergeSpeed = average(engineer.prMergeSpeedScores);
    const executionQuality =
      mergeReliability * 0.4 + landingQuality * 0.35 + mergeSpeed * 0.25;

    return {
      shippedWork,
      ownershipBreadth,
      reviewLeverage,
      executionQuality,
    };
  });
}

export function buildEngineerRankings(
  pullRequests: PullRequestRecord[],
  options?: {
    weights?: RankingWeights;
    authoredOpenedCounts?: Record<string, number>;
  },
): EngineerScoreBreakdown[] {
  const weights = options?.weights ?? DEFAULT_RANKING_WEIGHTS;
  const engineers = buildEngineerMetricsWithOpenedCounts(
    pullRequests,
    options?.authoredOpenedCounts ?? {},
  );
  const rawScores = computeRawScoreComponents(engineers);

  const shippedValues = normalize(rawScores.map((score) => score.shippedWork));
  const breadthValues = normalize(rawScores.map((score) => score.ownershipBreadth));
  const reviewValues = normalize(rawScores.map((score) => score.reviewLeverage));
  const executionValues = normalize(rawScores.map((score) => score.executionQuality));

  const rankings = engineers.map((engineer, index) => {
    const subscores: EngineerSubscores = {
      shipped_work: roundTo(shippedValues[index]),
      ownership_breadth: roundTo(breadthValues[index]),
      review_leverage: roundTo(reviewValues[index]),
      execution_quality: roundTo(executionValues[index]),
    };

    const mergeRate =
      engineer.authoredOpenedPrs > 0
        ? engineer.authoredMergedPrs / engineer.authoredOpenedPrs
        : 0;
    const medianTimeToMergeHours = median(engineer.mergeTimeHours);
    const averagePrImpactScore = average(engineer.prImpactScores);
    const highImpactPrs = engineer.prImpactScores.filter((score) => score >= 500).length;
    const impactConsistency =
      engineer.prImpactScores.length > 0
        ? engineer.prImpactScores.filter((score) => score >= averagePrImpactScore).length /
          engineer.prImpactScores.length
        : 0;

    const finalScore = roundTo(
      subscores.shipped_work * weights.shippedWork +
        subscores.ownership_breadth * weights.ownershipBreadth +
        subscores.review_leverage * weights.reviewLeverage +
        subscores.execution_quality * weights.executionQuality,
    );

    return {
      login: engineer.login,
      finalScore,
      reasons: buildReasonBullets(engineer, subscores, mergeRate, medianTimeToMergeHours),
      rawScores: rawScores[index],
      metrics: {
        authoredMergedPrs: engineer.authoredMergedPrs,
        authoredOpenedPrs: engineer.authoredOpenedPrs,
        reviewsGiven: engineer.reviewsGiven,
        distinctAreas: engineer.distinctAreas,
        mergeRate: roundTo(mergeRate * 100),
        medianTimeToMergeHours: roundTo(medianTimeToMergeHours),
        averagePrImpactScore: roundTo(averagePrImpactScore),
        highImpactPrs,
        impactConsistency: roundTo(impactConsistency * 100),
      },
      subscores,
    } satisfies EngineerScoreBreakdown;
  });

  return rankings.sort((a, b) => b.finalScore - a.finalScore);
}

function buildReasonBullets(
  engineer: EngineerRawMetrics,
  subscores: EngineerSubscores,
  mergeRate: number,
  medianTimeToMergeHours: number,
): string[] {
  const bullets: string[] = [];

  if (engineer.authoredMergedPrs > 0) {
    if (engineer.distinctAreas.length > 0) {
      bullets.push(
        `Shipped ${engineer.authoredMergedPrs} merged PRs across ${engineer.distinctAreas.length} code areas`,
      );
    } else {
      bullets.push(`Shipped ${engineer.authoredMergedPrs} merged PRs in the last 90 days`);
    }
  }

  if (engineer.reviewsGiven > 0) {
    bullets.push(`Reviewed ${engineer.reviewsGiven} peer PRs during the window`);
  }

  const highImpactPrs = engineer.prImpactScores.filter((score) => score >= 500).length;
  if (highImpactPrs > 0) {
    bullets.push(`${highImpactPrs} PRs scored as high-impact based on importance and leverage`);
  }

  const strongestScore = Math.max(
    subscores.shipped_work,
    subscores.ownership_breadth,
    subscores.review_leverage,
    subscores.execution_quality,
  );

  if (strongestScore === subscores.execution_quality && engineer.authoredOpenedPrs > 0) {
    bullets.push(
      `Strong execution with a ${roundTo(mergeRate * 100)}% merge rate and ${roundTo(medianTimeToMergeHours)}h median time to merge`,
    );
  } else if (
    strongestScore === subscores.ownership_breadth &&
    engineer.distinctAreas.length > 0
  ) {
    bullets.push(`Touched ${engineer.distinctAreas.length} distinct top-level code areas`);
  } else if (strongestScore === subscores.review_leverage && engineer.reviewsGiven > 0) {
    bullets.push("Created leverage through above-average code review activity");
  } else {
    bullets.push("Balanced shipping volume, repo breadth, and execution efficiency");
  }

  return bullets.slice(0, 3);
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function computePrImpactScore(pullRequest: PullRequestRecord): number {
  const importance = scoreImportance(pullRequest);
  const scope = scoreScope(pullRequest);
  const complexity = scoreComplexity(pullRequest);
  const quality = scoreQuality(pullRequest);
  const leverage = scoreLeverage(pullRequest);

  return importance * scope * complexity * quality * leverage;
}

function scoreMergeSpeed(pullRequest: PullRequestRecord): number {
  const mergeTimeHours = getMergeTimeHours(pullRequest.createdAt, pullRequest.mergedAt);
  let score = 20;

  if (mergeTimeHours < 24) {
    score = 100;
  } else if (mergeTimeHours < 24 * 3) {
    score = 80;
  } else if (mergeTimeHours < 24 * 7) {
    score = 60;
  } else if (mergeTimeHours < 24 * 14) {
    score = 40;
  }

  const complexity = scoreComplexity(pullRequest);
  if (complexity >= 4.5 && score < 100) {
    score += 20;
  } else if (complexity >= 3.5 && score < 100) {
    score += 10;
  }

  return clamp(score, 20, 100);
}

function scoreLandingQuality(pullRequest: PullRequestRecord): number {
  const text = `${pullRequest.title} ${pullRequest.body}`.toLowerCase();
  const hasTests = pullRequest.files.some((file) =>
    /test|spec|__tests__|playwright|jest/i.test(file.path),
  );
  const approvals = pullRequest.reviews.filter((review) => review.state === "APPROVED").length;
  const reviewSignals = pullRequest.reviews.filter((review) =>
    ["APPROVED", "CHANGES_REQUESTED", "COMMENTED"].includes(review.state),
  ).length;
  const negativeSignals = ["revert", "hotfix", "follow-up", "temporary"].filter((keyword) =>
    text.includes(keyword),
  ).length;

  const baseScore =
    45 +
    (hasTests ? 20 : 0) +
    Math.min(approvals, 3) * 10 +
    Math.min(reviewSignals, 4) * 4 -
    negativeSignals * 15;

  return clamp(baseScore, 20, 100);
}

function scoreImportance(pullRequest: PullRequestRecord): number {
  const text = `${pullRequest.title} ${pullRequest.body} ${pullRequest.labels.join(" ")}`.toLowerCase();
  const importantKeywords = [
    "feature",
    "customer",
    "billing",
    "security",
    "performance",
    "reliability",
    "bug",
    "fix",
    "infra",
    "migration",
  ];
  const keywordMatches = importantKeywords.filter((keyword) => text.includes(keyword)).length;
  const highValueAreas = pullRequest.topLevelAreas.filter((area) =>
    ["frontend", "products", "posthog", "services", "ee", "common"].includes(area),
  ).length;

  return clamp(1 + keywordMatches * 0.5 + highValueAreas * 0.4, 1, 5);
}

function scoreScope(pullRequest: PullRequestRecord): number {
  return clamp(
    1 +
      logScale(pullRequest.changedFiles) * 0.9 +
      logScale(pullRequest.topLevelAreas.length) * 1.1,
    1,
    5,
  );
}

function scoreComplexity(pullRequest: PullRequestRecord): number {
  const text = `${pullRequest.title} ${pullRequest.body}`.toLowerCase();
  const complexityKeywords = ["refactor", "migration", "schema", "api", "query", "backfill"];
  const keywordMatches = complexityKeywords.filter((keyword) => text.includes(keyword)).length;
  const reviewRounds = pullRequest.reviews.length;

  return clamp(
    1 +
      logScale(pullRequest.changedFiles) * 0.7 +
      logScale(reviewRounds) * 1 +
      keywordMatches * 0.5,
    1,
    5,
  );
}

function scoreQuality(pullRequest: PullRequestRecord): number {
  return clamp(scoreLandingQuality(pullRequest) / 20, 1, 5);
}

function scoreLeverage(pullRequest: PullRequestRecord): number {
  const text = `${pullRequest.title} ${pullRequest.body}`.toLowerCase();
  const leverageKeywords = ["tooling", "infra", "platform", "foundation", "unblock", "shared"];
  const keywordMatches = leverageKeywords.filter((keyword) => text.includes(keyword)).length;
  const sharedAreas = pullRequest.topLevelAreas.filter((area) =>
    ["common", "services", "products", "frontend", "posthog"].includes(area),
  ).length;

  return clamp(1 + keywordMatches * 0.6 + sharedAreas * 0.5, 1, 5);
}
