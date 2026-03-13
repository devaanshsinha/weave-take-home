import type { EngineerScoreBreakdown } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface EngineerCardProps {
  engineer: EngineerScoreBreakdown;
  rank: number;
}

export function EngineerCard({ engineer, rank }: EngineerCardProps) {
  const rankStyles = [
    "bg-[#ff7a59]",
    "bg-[#ffd84d]",
    "bg-[#74d3ae]",
    "bg-[#77aaff]",
    "bg-[#f4a6ff]",
  ];

  return (
    <Card className="rounded-[22px] p-5">
      <div className="mb-4 flex items-center justify-between gap-3 border-b-2 border-black pb-4">
        <Badge
          className={rankStyles[(rank - 1) % rankStyles.length]}
          variant="mint"
        >
          Rank #{rank}
        </Badge>
        <Badge variant="black">
          Impact {engineer.finalScore}
        </Badge>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">{engineer.login}</h2>
        </div>
        <div className="rounded-2xl border-2 border-black bg-[#f3ecdc] px-3 py-2 text-right shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Merged PRs</p>
          <p className="font-mono text-xl font-semibold text-slate-900">
            {engineer.metrics.authoredMergedPrs}
          </p>
        </div>
      </div>

      <CardContent className="mt-4">
        <ul className="space-y-2 text-sm leading-6 text-slate-700">
        {engineer.reasons.map((reason) => (
          <li key={reason} className="rounded-2xl border border-black bg-white px-3 py-2">
            {reason}
          </li>
        ))}
        </ul>
      </CardContent>
    </Card>
  );
}
