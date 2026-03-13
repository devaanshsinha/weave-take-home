export function formatIsoDate(date: Date): string {
  return date.toISOString();
}

export function getCutoffDate(days: number): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}
