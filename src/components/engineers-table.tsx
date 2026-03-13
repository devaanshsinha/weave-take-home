import type { EngineerScoreBreakdown } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EngineersTableProps {
  engineers: EngineerScoreBreakdown[];
}

export function EngineersTable({ engineers }: EngineersTableProps) {
  if (engineers.length === 0) {
    return (
      <Card className="border-dashed p-6">
        <CardTitle className="text-lg">Top 10 engineers</CardTitle>
        <CardDescription className="mt-2">
          No ranked engineers yet. Generate a snapshot to populate this table.
        </CardDescription>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader className="mb-4">
        <Badge variant="mint">Leaderboard</Badge>
        <CardTitle className="mt-3">Top 10 engineers</CardTitle>
        <CardDescription className="mt-1">
          Supporting leaderboard with score components and operating metrics.
        </CardDescription>
      </CardHeader>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Engineer</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Avg PR Impact</TableHead>
              <TableHead>High-Impact PRs</TableHead>
              <TableHead>Breadth</TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Execution</TableHead>
              <TableHead>Merge Rate</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {engineers.map((engineer) => (
              <TableRow key={engineer.login} className="last:border-b-0">
                <TableCell className="font-medium text-slate-900">{engineer.login}</TableCell>
                <TableCell className="font-mono text-slate-900">{engineer.finalScore}</TableCell>
                <TableCell className="font-mono text-slate-600">
                  {engineer.metrics.averagePrImpactScore}
                </TableCell>
                <TableCell className="font-mono text-slate-600">
                  {engineer.metrics.highImpactPrs}
                </TableCell>
                <TableCell className="font-mono text-slate-600">
                  {engineer.subscores.ownership_breadth}
                </TableCell>
                <TableCell className="font-mono text-slate-600">
                  {engineer.subscores.review_leverage}
                </TableCell>
                <TableCell className="font-mono text-slate-600">
                  {engineer.subscores.execution_quality}
                </TableCell>
                <TableCell className="font-mono text-slate-600">
                  {engineer.metrics.mergeRate}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
