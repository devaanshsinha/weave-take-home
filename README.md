# PostHog Engineering Impact Dashboard

One-page Next.js dashboard that identifies the most impactful engineers in `PostHog/posthog` over the last 90 days using a precomputed GitHub snapshot.

## What It Does

- fetches GitHub pull request data for the last 90 days
- excludes bots
- scores PRs by inferred impact instead of raw activity alone
- ranks engineers by the strength and consistency of their shipped work
- renders a fast, static, laptop-friendly dashboard

The app is built so reviewers do not need a GitHub token or a live API fetch. The page reads snapshot JSON from `public/data/`.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Recharts
- local shadcn-style UI primitives
- GitHub GraphQL API for snapshot generation

## Scripts

```bash
npm run dev
npm run lint
npm run fetch-data
npm run build-snapshot
```

### `npm run fetch-data`

Fetches raw GitHub data and writes:

- `public/data/prs.json`
- `public/data/opened-pr-counts.json`
- `public/data/engineers.json`
- `public/data/summary.json`

### `npm run build-snapshot`

Rebuilds engineer rankings from the existing raw snapshot without making network requests.

Use this after changing scoring logic.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Add a GitHub token to `.env.local`:

```bash
GITHUB_TOKEN=your_token_here
```

3. Generate data:

```bash
npm run fetch-data
```

4. Start the app:

```bash
npm run dev
```

## Data Model

The snapshot covers the last 90 days of `PostHog/posthog` and includes:

- merged PRs
- PR title and body
- author
- created and merged timestamps
- additions, deletions, changed files
- labels
- reviews
- changed file paths
- authored opened-PR counts for merge-rate calculation

## Methodology

The ranking is intentionally PR-first rather than activity-first.

### PR Impact

Each PR gets an inferred impact score built from:

- `importance`
  - feature, bug, infra, performance, reliability, customer-facing, or other meaningful work signals
- `scope`
  - breadth of files and code areas touched
- `complexity`
  - risky/shared areas, refactor or migration signals, and review depth
- `quality`
  - tests, approvals, review signals, and absence of obvious revert/hotfix/follow-up language
- `leverage`
  - signals that the change enabled other work or improved shared systems

These are scored heuristically from available GitHub metadata.

### Engineer Ranking

Engineers are then ranked using:

- average PR impact
- number of high-impact PRs
- consistency of strong PRs over the last 90 days
- ownership breadth across meaningful top-level code areas
- review leverage from reviews on others' PRs
- execution quality

### Execution Quality

Execution quality is intentionally not a steep speed penalty.

It uses:

- `mergeReliability`
  - merged PRs / opened PRs in the window
- `landingQuality`
  - tests, approvals, review activity, and negative signals like revert/hotfix/follow-up wording
- `mergeSpeed`
  - broad time-to-merge buckets:
    - `<1d = 100`
    - `1–3d = 80`
    - `3–7d = 60`
    - `7–14d = 40`
    - `>14d = 20`

Final execution formula:

```txt
executionQuality =
  0.40 * mergeReliability +
  0.35 * landingQuality +
  0.25 * mergeSpeed
```

### Breadth Bucketing

Top-level file paths are bucketed to avoid overcounting repo housekeeping as product breadth.

Examples:

- product/code areas remain distinct:
  - `frontend`
  - `products`
  - `posthog`
  - `services`
  - `common`
  - `ee`
  - `rust`
  - `nodejs`
- repo-maintenance paths collapse into broader buckets:
  - `docs`
  - `infra`
  - `tooling`
  - `repo-meta`

## Snapshot Files

- `public/data/prs.json`
  - raw enriched PR snapshot
- `public/data/opened-pr-counts.json`
  - opened PR count by author for merge-rate denominator
- `public/data/engineers.json`
  - per-engineer aggregates, subscores, and explanation bullets
- `public/data/summary.json`
  - dashboard summary, top 5, and top 10

## Deployment

Recommended take-home deployment flow:

1. Run:

```bash
npm run fetch-data
```

2. Commit the generated files in `public/data/`

3. Deploy to Vercel

Because the dashboard is snapshot-based, the deployed app loads quickly and does not depend on runtime GitHub access.

## Current Caveats

- PR impact is inferred heuristically from GitHub metadata, not code semantics
- some signals that would improve confidence, like CI check conclusions or revert chains, are only partially approximated today
- the dashboard is intended as an impact snapshot, not a performance review

## Next Steps

Before submission, the remaining highest-value tasks are:

1. sanity-check the final top 5 for plausibility
2. tighten any remaining UI rough edges
3. deploy to Vercel
4. replace this with the final deployed URL in your submission
5. send:
   - deployed URL
   - short approach blurb under 300 characters
   - exact time spent
   - coding agent session export

## Suggested Submission Blurb

```txt
Built a one-page impact dashboard for PostHog using a precomputed GitHub snapshot. Ranked engineers using inferred PR impact, breadth, review leverage, and execution quality instead of raw PR volume or LOC.
```
