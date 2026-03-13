# PostHog Engineering Impact Dashboard

One-page Next.js + TypeScript dashboard for identifying the top 5 most impactful engineers in `PostHog/posthog` over the last 90 days.

## Goal

Build a fast, laptop-friendly dashboard for a busy engineering leader that answers:

- Who had the highest impact recently?
- Why did they rank highly?
- How was impact calculated?

The dashboard should avoid naive rankings based only on PR count, commit count, or lines changed.

## Product Scope

- Single-page dashboard
- Static data generated ahead of time into `public/data/*.json`
- GitHub data source using a token from environment variables
- Last 90 days of activity
- Top 5 engineer cards
- Selectable score breakdown for one engineer
- Supporting top 10 table
- Clear explanation of the metric on the page
- Vercel-friendly deployment

## Recommended API Approach

Use the GitHub REST API for the first implementation.

Why:

- The required pull request fields map directly to REST endpoints
- Reviews and changed files are straightforward to fetch per PR
- It is simpler to debug in a timed assignment
- It is easier to explain in the README and in the final submission

GraphQL is a valid fallback if request volume or rate limits become a problem, but REST is the simpler and safer default for this project.

## Data Requirements

For each merged PR in the last 90 days, collect:

- author
- title
- body
- created_at
- merged_at
- additions
- deletions
- changed_files
- labels
- reviews
- changed file paths

Also collect enough review data to count reviews given on other engineers' PRs.

Exclude bots from author and reviewer rankings.

## Impact Definition

Impact is modeled as four weighted subscores. Each subscore should be normalized before combining into a final score.

### 1. `shipped_work`

What it captures:

- meaningful shipped output without over-rewarding raw volume

Signals:

- merged PR count with diminishing returns
- PR size using `log1p(additions + deletions)`
- PR complexity using `log1p(changed_files)`
- optional light use of labels if they help explain work type

Why it matters:

- rewards sustained shipping while avoiding a raw-LOC leaderboard

### 2. `ownership_breadth`

What it captures:

- how broadly an engineer contributed across the repo

Signals:

- count of distinct top-level areas touched
- optional balance across areas so one-off touches do not dominate

How to infer areas:

- derive the top-level area from file paths
- examples:
  - `frontend/src/...` -> `frontend`
  - `products/...` -> `products`
  - `plugin-server/...` -> `plugin-server`
  - `README.md` -> `root`

Why it matters:

- recognizes engineers who move important work across multiple parts of the codebase

### 3. `review_leverage`

What it captures:

- how much an engineer helps others ship

Signals:

- reviews submitted on other people's PRs during the same 90-day window
- optionally weight stronger review states slightly more than comments

Why it matters:

- impact includes unblocking, quality control, and knowledge sharing

### 4. `execution_quality`

What it captures:

- how reliably and efficiently work moves through review to merge

Signals:

- merge rate: merged PRs / PRs opened in the window
- median time to merge

Why it matters:

- favors engineers who ship effectively, not just frequently

## Proposed Score Formula

Recommended weights:

- `shipped_work`: 40%
- `ownership_breadth`: 25%
- `review_leverage`: 20%
- `execution_quality`: 15%

Final score:

```txt
impact_score =
  0.40 * shipped_work +
  0.25 * ownership_breadth +
  0.20 * review_leverage +
  0.15 * execution_quality
```

Implementation notes:

- normalize each subscore across engineers to a common `0..100` scale
- use `log1p(...)` for additions, deletions, and changed files
- do not rank by raw PR count, raw LOC, or commit totals alone

## Execution Plan

This is the implementation order we should follow.

### Phase 1: Data pipeline

1. Create `scripts/fetch-data.ts`
2. Read `GITHUB_TOKEN` from environment
3. Define a 90-day cutoff date
4. Fetch PRs for `PostHog/posthog`
5. Filter to PRs with `merged_at >= cutoff`
6. Exclude bot authors
7. For each PR:
   - fetch reviews
   - fetch changed files
   - derive top-level areas touched
8. Aggregate engineer-level metrics
9. Compute normalized subscores and final score
10. Generate explanation bullets for the top engineers
11. Write JSON files into `public/data/`

### Phase 2: Frontend

1. Replace the starter homepage
2. Build a page header with:
   - title
   - date range
   - short metric explainer
3. Build top 5 engineer cards
4. Build a selectable engineer breakdown chart with Recharts
5. Build a top 10 supporting table
6. Add a short methodology section on the page

### Phase 3: Polish and deployment

1. Validate that the page loads quickly with static JSON
2. Check mobile and laptop layout
3. Update README setup and deploy steps
4. Deploy to Vercel

## Concrete Build Checklist

Use this as the execution checklist while implementing:

### Setup

- [ ] Add `.env.local` with `GITHUB_TOKEN`
- [ ] Add a `fetch-data` script to `package.json`
- [ ] Create `scripts/` directory
- [ ] Create `public/data/` directory

### Types and utilities

- [ ] Add shared TypeScript types for PRs, reviews, engineers, and scores
- [ ] Add date helpers and formatting helpers
- [ ] Add scoring helpers with normalization and log scaling

### Data fetching

- [ ] Fetch merged PRs in the last 90 days
- [ ] Fetch PR reviews for each merged PR
- [ ] Fetch changed files for each merged PR
- [ ] Exclude bot authors and bot reviewers
- [ ] Count reviews given on others' PRs

### Aggregation

- [ ] Compute shipped work metrics per engineer
- [ ] Compute ownership breadth from top-level file paths
- [ ] Compute review leverage
- [ ] Compute merge rate and median time to merge
- [ ] Normalize subscores
- [ ] Compute final weighted score
- [ ] Sort engineers and select top 5 and top 10
- [ ] Generate 3 short reason bullets per top 5 engineer

### Frontend

- [ ] Build the top 5 card grid
- [ ] Build the engineer selector
- [ ] Build the score breakdown chart
- [ ] Build the top 10 table
- [ ] Add metric explanation copy
- [ ] Make the page work well on a laptop screen

### Final verification

- [ ] Run data fetch successfully
- [ ] Run lint
- [ ] Run local build
- [ ] Confirm JSON assets are present
- [ ] Confirm page renders without runtime fetch issues
- [ ] Deploy to Vercel

## Suggested File Structure

```txt
src/
  app/
    globals.css
    layout.tsx
    page.tsx
  components/
    engineer-card.tsx
    engineers-table.tsx
    metric-explainer.tsx
    score-breakdown-chart.tsx
  lib/
    format.ts
    scoring.ts
    types.ts
scripts/
  fetch-data.ts
public/
  data/
    engineers.json
    prs.json
    summary.json
```

## JSON Output Plan

Recommended generated files:

### `public/data/prs.json`

Raw or lightly transformed PR data used for traceability.

### `public/data/engineers.json`

Per-engineer aggregates and subscores.

### `public/data/summary.json`

Small summary payload for page metadata and defaults:

- repo
- generatedAt
- cutoffDate
- top5
- top10
- metric description

## UI Plan

The page should fit on one screen section stack for a laptop without feeling crowded.

Recommended sections:

1. Header
2. Metric explainer
3. Top 5 cards
4. Engineer breakdown chart
5. Top 10 table
6. Methodology note

The most important UX rule:

- every score shown should be explainable at a glance

## Reason Bullet Strategy

Each top 5 card should include 3 short reasons derived from the engineer's strongest signals.

Examples:

- "Shipped 8 merged PRs across 6 code areas"
- "Reviewed 17 peer PRs in the last 90 days"
- "Fast merge cycle with above-average execution quality"

These bullets are important because the assignment specifically values thoughtfulness and clarity over flashy visuals.

## What Needs To Happen From Your Side

- Create a GitHub token with public repo read access
- Add it to `.env.local` as `GITHUB_TOKEN`
- Decide whether generated JSON should be committed before deployment
- Keep a timer running for the assignment
- Save the coding agent session export for submission

## Local Development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Once the fetch script exists, generate fresh data with:

```bash
npm run fetch-data
```

## Deployment Plan

Recommended approach for the take-home:

- run `npm run fetch-data`
- commit the generated `public/data/*.json`
- deploy to Vercel

This is safer than relying on runtime API access and reduces the chance of a broken demo.

Alternative:

- configure Vercel build command as `npm run fetch-data && npm run build`
- add `GITHUB_TOKEN` in Vercel environment variables

## Notes On Scope

This assignment is better served by a thoughtful metric and a reliable dashboard than by a complex architecture.

Priorities:

- correct data
- clear explanation
- credible ranking logic
- fast page load

Avoid spending time on:

- live client-side GitHub fetching
- multi-page routing
- unnecessary animation
- over-engineered state management

## Submission Reminder

The final submission should include:

- deployed URL
- short description of approach
- actual time spent
- coding agent session export
