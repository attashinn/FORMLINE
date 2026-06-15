export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type MonthBucket = {
  month: number;
  year: number;
  label: string;
};

export type MonthlyCount = MonthBucket & {
  count: number;
};

export type AreaChartPoint = MonthlyCount & {
  x: number;
  y: number;
};

export type AreaChartGeometry = {
  points: AreaChartPoint[];
  strokePath: string;
  fillPath: string;
  maxCount: number;
  yTickValues: number[];
  hasData: boolean;
};

/** Last N calendar months ending in the current month. */
export function getLastMonthBuckets(count = 6): MonthBucket[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return {
      month: d.getMonth(),
      year: d.getFullYear(),
      label: MONTH_LABELS[d.getMonth()],
    };
  });
}

export function countItemsByMonth<T>(
  items: T[],
  buckets: MonthBucket[],
  getDate: (item: T) => Date,
): MonthlyCount[] {
  return buckets.map((bucket) => ({
    ...bucket,
    count: items.filter((item) => {
      const d = getDate(item);
      return d.getMonth() === bucket.month && d.getFullYear() === bucket.year;
    }).length,
  }));
}

function buildBezierPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  return points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[i - 1];
    const cpx = (prev.x + pt.x) / 2;
    return `${acc} C ${cpx} ${prev.y}, ${cpx} ${pt.y}, ${pt.x} ${pt.y}`;
  }, "");
}

function niceTickValues(max: number): number[] {
  if (max <= 0) return [0];
  if (max <= 4) return Array.from({ length: max + 1 }, (_, i) => max - i);
  return [max, Math.ceil((max * 3) / 4), Math.ceil(max / 2), Math.ceil(max / 4), 0].filter(
    (v, i, arr) => i === 0 || v !== arr[i - 1],
  );
}

type AreaChartOptions = {
  xStart?: number;
  xStep?: number;
  yTop?: number;
  yBottom?: number;
};

/** Map monthly counts to SVG area-chart geometry (shared by dashboard + analytics). */
export function buildMonthlyAreaChart(
  monthly: MonthlyCount[],
  options: AreaChartOptions = {},
): AreaChartGeometry {
  const xStart = options.xStart ?? 50;
  const xStep = options.xStep ?? 90;
  const yTop = options.yTop ?? 70;
  const yBottom = options.yBottom ?? 190;

  const maxCount = Math.max(...monthly.map((m) => m.count), 0);
  const scaleMax = Math.max(maxCount, 1);
  const plotHeight = yBottom - yTop;

  const points: AreaChartPoint[] = monthly.map((m, i) => ({
    ...m,
    x: xStart + i * xStep,
    y: yBottom - Math.round((m.count / scaleMax) * plotHeight),
  }));

  const strokePath = buildBezierPath(points);
  const fillPath = strokePath
    ? `${strokePath} L ${points[points.length - 1].x} ${yBottom + 30} L ${points[0].x} ${yBottom + 30} Z`
    : "";

  return {
    points,
    strokePath,
    fillPath,
    maxCount,
    yTickValues: niceTickValues(maxCount),
    hasData: maxCount > 0,
  };
}
