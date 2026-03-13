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
