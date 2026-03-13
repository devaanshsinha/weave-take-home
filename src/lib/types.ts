export type ScoreKey =
  | "shipped_work"
  | "ownership_breadth"
  | "review_leverage"
  | "execution_quality";

export interface GitHubLabel {
  name: string;
}

export interface PullRequestReviewRecord {
  id: number;
  author: string;
  state: string;
  submittedAt: string | null;
}

export interface PullRequestFileRecord {
  path: string;
  additions: number;
  deletions: number;
  changes: number;
}

export interface PullRequestRecord {
  number: number;
  author: string;
  title: string;
  body: string;
  createdAt: string;
  mergedAt: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  labels: string[];
  files: PullRequestFileRecord[];
  reviews: PullRequestReviewRecord[];
  topLevelAreas: string[];
}

export interface EngineerRawMetrics {
  login: string;
  authoredMergedPrs: number;
  authoredOpenedPrs: number;
  reviewsGiven: number;
  totalAdditions: number;
  totalDeletions: number;
  totalChangedFiles: number;
  distinctAreas: string[];
  mergeTimeHours: number[];
}

export interface EngineerRawScoreComponents {
  shippedWork: number;
  ownershipBreadth: number;
  reviewLeverage: number;
  executionQuality: number;
}

export interface EngineerSubscores {
  shipped_work: number;
  ownership_breadth: number;
  review_leverage: number;
  execution_quality: number;
}

export interface EngineerScoreBreakdown {
  login: string;
  finalScore: number;
  reasons: string[];
  rawScores: EngineerRawScoreComponents;
  metrics: {
    authoredMergedPrs: number;
    authoredOpenedPrs: number;
    reviewsGiven: number;
    distinctAreas: string[];
    mergeRate: number;
    medianTimeToMergeHours: number;
  };
  subscores: EngineerSubscores;
}

export interface DashboardSummary {
  repo: string;
  generatedAt: string;
  cutoffDate: string;
  engineerCount: number;
  mergedPrCount: number;
  top5: EngineerScoreBreakdown[];
  top10: EngineerScoreBreakdown[];
}

export interface RankingWeights {
  shippedWork: number;
  ownershipBreadth: number;
  reviewLeverage: number;
  executionQuality: number;
}
