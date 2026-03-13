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
    return values.map(() => 100);
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
  const [topLevel] = path.split("/");
  return topLevel && topLevel.length > 0 ? topLevel : "root";
}

export function isBotLogin(login: string): boolean {
  return login.endsWith("[bot]");
}

export function roundTo(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
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
  const engineers = new Map<string, EngineerRawMetrics>();
  const reviewCounts = new Map<string, number>();

  for (const pullRequest of pullRequests) {
    const existing = engineers.get(pullRequest.author);
    const current =
      existing ??
      ({
        login: pullRequest.author,
        authoredMergedPrs: 0,
        authoredOpenedPrs: 0,
        reviewsGiven: 0,
        totalAdditions: 0,
        totalDeletions: 0,
        totalChangedFiles: 0,
        distinctAreas: [],
        mergeTimeHours: [],
      } satisfies EngineerRawMetrics);

    current.authoredMergedPrs += 1;
    current.authoredOpenedPrs += 1;
    current.totalAdditions += pullRequest.additions;
    current.totalDeletions += pullRequest.deletions;
    current.totalChangedFiles += pullRequest.changedFiles;
    current.mergeTimeHours.push(getMergeTimeHours(pullRequest.createdAt, pullRequest.mergedAt));

    const allAreas = new Set([...current.distinctAreas, ...pullRequest.topLevelAreas]);
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
      authoredOpenedPrs: 0,
      reviewsGiven: count,
      totalAdditions: 0,
      totalDeletions: 0,
      totalChangedFiles: 0,
      distinctAreas: [],
      mergeTimeHours: [],
    });
  }

  return [...engineers.values()];
}

export function computeRawScoreComponents(
  engineers: EngineerRawMetrics[],
): EngineerRawScoreComponents[] {
  return engineers.map((engineer) => {
    const shippedWork =
      logScale(engineer.authoredMergedPrs) * 1.2 +
      logScale(engineer.totalAdditions + engineer.totalDeletions) +
      logScale(engineer.totalChangedFiles);

    const ownershipBreadth =
      engineer.distinctAreas.length > 0 ? logScale(engineer.distinctAreas.length) : 0;

    const reviewLeverage = logScale(engineer.reviewsGiven);

    const mergeRate =
      engineer.authoredOpenedPrs > 0
        ? engineer.authoredMergedPrs / engineer.authoredOpenedPrs
        : 0;
    const medianTimeToMergeHours = median(engineer.mergeTimeHours);
    const speedBonus =
      medianTimeToMergeHours > 0 ? 1 / Math.log1p(1 + medianTimeToMergeHours) : 0;

    const executionQuality = mergeRate * 0.7 + speedBonus * 0.3;

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
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS,
): EngineerScoreBreakdown[] {
  const engineers = buildEngineerMetrics(pullRequests);
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
    bullets.push(
      `Shipped ${engineer.authoredMergedPrs} merged PRs across ${Math.max(engineer.distinctAreas.length, 1)} code areas`,
    );
  }

  if (engineer.reviewsGiven > 0) {
    bullets.push(`Reviewed ${engineer.reviewsGiven} peer PRs during the window`);
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
