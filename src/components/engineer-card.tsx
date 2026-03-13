import type { EngineerScoreBreakdown } from "@/lib/types";

interface EngineerCardProps {
  engineer: EngineerScoreBreakdown;
  rank: number;
}

export function EngineerCard({ engineer, rank }: EngineerCardProps) {
  return (
    <article className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Rank #{rank}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">{engineer.login}</h2>
        </div>
        <div className="rounded-xl border border-slate-900 bg-slate-900 px-3 py-2 text-right text-white">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Impact</p>
          <p className="text-2xl font-semibold">{engineer.finalScore}</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2 border-t border-black/10 pt-4 text-sm text-slate-600">
        {engineer.reasons.map((reason) => (
          <li key={reason}>• {reason}</li>
        ))}
      </ul>
    </article>
  );
}
