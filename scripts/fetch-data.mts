import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatIsoDate, getCutoffDate } from "../src/lib/format.ts";
import {
  buildEngineerRankings,
  deriveTopLevelArea,
  isBotLogin,
} from "../src/lib/scoring.ts";
import type { DashboardSummary, PullRequestRecord } from "../src/lib/types.ts";

const REPO_OWNER = "PostHog";
const REPO_NAME = "posthog";
const WINDOW_DAYS = 90;
const SEARCH_PAGE_SIZE = 50;
const BUCKET_DAYS = 7;
const REQUEST_DELAY_MS = 300;
const MAX_RETRIES = 4;

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const projectRoot = path.resolve(currentDir, "..");
const outputDir = path.join(projectRoot, "public", "data");
const envFilePath = path.join(projectRoot, ".env.local");

interface GraphQLActor {
  __typename: string;
  login?: string | null;
}

interface GraphQLLabelNode {
  name: string;
}

interface GraphQLPullRequestNode {
  number: number;
  title: string;
  body: string | null;
  createdAt: string;
  mergedAt: string | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  author: GraphQLActor | null;
  labels: {
    nodes: GraphQLLabelNode[];
  };
  files: {
    nodes: Array<{
      path: string;
      additions: number;
      deletions: number;
      changeType: string;
    } | null>;
  };
  reviews: {
    nodes: Array<{
      id: string;
      state: string;
      submittedAt: string | null;
      author: GraphQLActor | null;
    } | null>;
  };
}

interface GraphQLSearchResponse {
  search: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    nodes: Array<GraphQLPullRequestNode | null>;
  };
}

interface GraphQLOpenedPullRequestNode {
  author: GraphQLActor | null;
}

interface GraphQLOpenedPullRequestSearchResponse {
  search: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    nodes: Array<GraphQLOpenedPullRequestNode | null>;
  };
}

interface GraphQLErrorResponse {
  errors?: Array<{ message: string }>;
}

interface DateBucket {
  start: Date;
  end: Date;
}

function parseEnvFile(contents: string): Record<string, string> {
  const lines = contents.split("\n");
  const parsed: Record<string, string> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (key) {
      parsed[key] = value;
    }
  }

  return parsed;
}

async function loadGitHubToken(): Promise<string | undefined> {
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }

  try {
    const envFile = await readFile(envFilePath, "utf8");
    const parsed = parseEnvFile(envFile);
    return parsed.GITHUB_TOKEN;
  } catch {
    return undefined;
  }
}

function getSearchQuery(bucket: DateBucket): string {
  const start = bucket.start.toISOString().slice(0, 10);
  const end = bucket.end.toISOString().slice(0, 10);
  return `repo:${REPO_OWNER}/${REPO_NAME} is:pr is:merged merged:${start}..${end}`;
}

function getOpenedPullRequestSearchQuery(bucket: DateBucket): string {
  const start = bucket.start.toISOString().slice(0, 10);
  const end = bucket.end.toISOString().slice(0, 10);
  return `repo:${REPO_OWNER}/${REPO_NAME} is:pr created:${start}..${end}`;
}

function buildPullRequestSearchQuery(): string {
  return `
    query PullRequests($query: String!, $first: Int!, $after: String) {
      search(query: $query, type: ISSUE, first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          ... on PullRequest {
            number
            title
            body
            createdAt
            mergedAt
            additions
            deletions
            changedFiles
            author {
              __typename
              login
            }
            labels(first: 20) {
              nodes {
                name
              }
            }
            files(first: 100) {
              nodes {
                path
                additions
                deletions
                changeType
              }
            }
            reviews(first: 100) {
              nodes {
                id
                state
                submittedAt
                author {
                  __typename
                  login
                }
              }
            }
          }
        }
      }
    }
  `;
}

function buildOpenedPullRequestSearchQuery(): string {
  return `
    query OpenedPullRequests($query: String!, $first: Int!, $after: String) {
      search(query: $query, type: ISSUE, first: $first, after: $after) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          ... on PullRequest {
            author {
              __typename
              login
            }
          }
        }
      }
    }
  `;
}

async function graphqlRequest<T>(
  token: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "posthog-engineering-impact-dashboard",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    const payload = (await response.json()) as { data?: T } & GraphQLErrorResponse;

    if (response.ok && payload.data && !payload.errors?.length) {
      return payload.data;
    }

    const message =
      payload.errors?.map((error) => error.message).join("; ") ||
      `HTTP ${response.status}`;
    const isRateLimited = message.toLowerCase().includes("rate limit");

    if (isRateLimited && attempt < MAX_RETRIES) {
      const waitMs = 5000 * (attempt + 1);
      console.warn(`GraphQL rate limit hit. Waiting ${waitMs}ms before retrying...`);
      await sleep(waitMs);
      continue;
    }

    throw new Error(`GitHub GraphQL request failed: ${message}`);
  }

  throw new Error(`GitHub GraphQL request failed after ${MAX_RETRIES + 1} attempts.`);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function buildDateBuckets(cutoffDate: Date, endDate: Date, daysPerBucket: number): DateBucket[] {
  const buckets: DateBucket[] = [];
  let bucketStart = new Date(cutoffDate);

  while (bucketStart <= endDate) {
    const bucketEnd = new Date(bucketStart);
    bucketEnd.setDate(bucketEnd.getDate() + daysPerBucket - 1);

    if (bucketEnd > endDate) {
      bucketEnd.setTime(endDate.getTime());
    }

    buckets.push({
      start: new Date(bucketStart),
      end: new Date(bucketEnd),
    });

    bucketStart = new Date(bucketEnd);
    bucketStart.setDate(bucketStart.getDate() + 1);
  }

  return buckets;
}

function toPullRequestRecord(node: GraphQLPullRequestNode): PullRequestRecord | null {
  const login = node.author?.login ?? "";
  const isBotAuthor = node.author?.__typename === "Bot" || isBotLogin(login);

  if (!node.mergedAt || !login || isBotAuthor) {
    return null;
  }

  const files = node.files.nodes
    .flatMap((file) => {
      if (!file?.path) {
        return [];
      }

      return [
        {
          path: file.path,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.additions + file.deletions,
        },
      ];
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  const reviews = node.reviews.nodes.flatMap((review) => {
    const reviewerLogin = review?.author?.login ?? "";
    const isBotReviewer =
      review?.author?.__typename === "Bot" || isBotLogin(reviewerLogin);

    if (!review || !reviewerLogin || isBotReviewer) {
      return [];
    }

    return [
      {
        id: Number.parseInt(review.id.replace(/\D/g, ""), 10) || 0,
        author: reviewerLogin,
        state: review.state,
        submittedAt: review.submittedAt,
      },
    ];
  });

  const topLevelAreas = [...new Set(files.map((file) => deriveTopLevelArea(file.path)))];

  return {
    number: node.number,
    author: login,
    title: node.title,
    body: node.body ?? "",
    createdAt: node.createdAt,
    mergedAt: node.mergedAt,
    additions: node.additions,
    deletions: node.deletions,
    changedFiles: node.changedFiles,
    labels: node.labels.nodes.map((label) => label.name),
    files,
    reviews,
    topLevelAreas,
  };
}

async function fetchMergedPullRequests(
  token: string,
  cutoffDate: Date,
): Promise<PullRequestRecord[]> {
  const now = new Date();
  const buckets = buildDateBuckets(cutoffDate, now, BUCKET_DAYS);
  const query = buildPullRequestSearchQuery();
  const pullRequests = new Map<number, PullRequestRecord>();

  for (const bucket of buckets) {
    const bucketLabel = `${bucket.start.toISOString().slice(0, 10)}..${bucket.end
      .toISOString()
      .slice(0, 10)}`;
    let hasNextPage = true;
    let cursor: string | null = null;

    console.log(`Fetching merged PRs for ${bucketLabel}...`);

    while (hasNextPage) {
      const data: GraphQLSearchResponse = await graphqlRequest<GraphQLSearchResponse>(
        token,
        query,
        {
        query: getSearchQuery(bucket),
        first: SEARCH_PAGE_SIZE,
        after: cursor,
        },
      );

      for (const node of data.search.nodes) {
        if (!node) {
          continue;
        }

        const pullRequest = toPullRequestRecord(node);
        if (pullRequest) {
          pullRequests.set(pullRequest.number, pullRequest);
        }
      }

      hasNextPage = data.search.pageInfo.hasNextPage;
      cursor = data.search.pageInfo.endCursor;

      if (hasNextPage) {
        await sleep(REQUEST_DELAY_MS);
      }
    }

    await sleep(REQUEST_DELAY_MS);
  }

  return [...pullRequests.values()].sort((a, b) => a.number - b.number);
}

async function fetchOpenedPullRequestCounts(
  token: string,
  cutoffDate: Date,
): Promise<Record<string, number>> {
  const now = new Date();
  const buckets = buildDateBuckets(cutoffDate, now, BUCKET_DAYS);
  const query = buildOpenedPullRequestSearchQuery();
  const authoredOpenedCounts = new Map<string, number>();

  for (const bucket of buckets) {
    let hasNextPage = true;
    let cursor: string | null = null;

    while (hasNextPage) {
      const data: GraphQLOpenedPullRequestSearchResponse =
        await graphqlRequest<GraphQLOpenedPullRequestSearchResponse>(token, query, {
          query: getOpenedPullRequestSearchQuery(bucket),
          first: SEARCH_PAGE_SIZE,
          after: cursor,
        });

      for (const node of data.search.nodes) {
        const login = node?.author?.login ?? "";
        const isBotAuthor = node?.author?.__typename === "Bot" || isBotLogin(login);

        if (!login || isBotAuthor) {
          continue;
        }

        authoredOpenedCounts.set(login, (authoredOpenedCounts.get(login) ?? 0) + 1);
      }

      hasNextPage = data.search.pageInfo.hasNextPage;
      cursor = data.search.pageInfo.endCursor;

      if (hasNextPage) {
        await sleep(REQUEST_DELAY_MS);
      }
    }

    await sleep(REQUEST_DELAY_MS);
  }

  return Object.fromEntries(authoredOpenedCounts.entries());
}

async function main(): Promise<void> {
  const token = await loadGitHubToken();

  if (!token) {
    console.error("Missing GITHUB_TOKEN in environment.");
    process.exitCode = 1;
    return;
  }

  const cutoffDate = getCutoffDate(WINDOW_DAYS);

  await mkdir(outputDir, { recursive: true });

  console.log(`Fetching merged pull requests for ${REPO_OWNER}/${REPO_NAME} via GraphQL...`);

  const pullRequests = await fetchMergedPullRequests(token, cutoffDate);
  console.log(`Fetching opened PR counts for ${REPO_OWNER}/${REPO_NAME}...`);
  const authoredOpenedCounts = await fetchOpenedPullRequestCounts(token, cutoffDate);
  const engineerRankings = buildEngineerRankings(pullRequests, {
    authoredOpenedCounts,
  });
  const top5 = engineerRankings.slice(0, 5);
  const top10 = engineerRankings.slice(0, 10);

  const summary: DashboardSummary = {
    repo: `${REPO_OWNER}/${REPO_NAME}`,
    generatedAt: formatIsoDate(new Date()),
    cutoffDate: formatIsoDate(cutoffDate),
    engineerCount: engineerRankings.length,
    mergedPrCount: pullRequests.length,
    top5,
    top10,
  };

  await writeFile(
    path.join(outputDir, "prs.json"),
    `${JSON.stringify(pullRequests, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outputDir, "engineers.json"),
    `${JSON.stringify(engineerRankings, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outputDir, "opened-pr-counts.json"),
    `${JSON.stringify(authoredOpenedCounts, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outputDir, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );

  console.log(`Merged PRs written: ${pullRequests.length}`);
  console.log(`Ranked engineers written: ${engineerRankings.length}`);
  console.log(`Cutoff: ${summary.cutoffDate}`);
}

void main();
