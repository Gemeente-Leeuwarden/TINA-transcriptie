const SPEED = 2;
const INTENSITY = 2;
const REACH = 100;

export const OPACITY = 0.05;
export const VW = 1440;
export const VH = 900;
const CENTER_Y = VH * 0.48;
const CURVE_POINTS = 120;

function catmullRom(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";

  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    d += ` C${p1.x + (p2.x - p0.x) / 6},${p1.y + (p2.y - p0.y) / 6}`;
    d += ` ${p2.x - (p3.x - p1.x) / 6},${p2.y - (p3.y - p1.y) / 6}`;
    d += ` ${p2.x},${p2.y}`;
  }

  return d;
}

export function buildWaveform(time: number): string {
  const t_ = time * SPEED;
  const heights: number[] = [];
  const xs: number[] = [];

  for (let i = 0; i <= CURVE_POINTS; i++) {
    const t = i / CURVE_POINTS;
    xs.push(t * VW);

    const dist = Math.abs(t - 0.5) / 0.5;
    const bell = 1 - dist * dist;
    const n1 = Math.sin(t * 25 + 1.5 + t_ * 0.8) * 0.15 * INTENSITY;
    const n2 = Math.sin(t * 50 + 0.7 - t_ * 1.2) * 0.08 * INTENSITY;
    const n3 = Math.sin(t * 80 + 3.1 + t_ * 0.5) * 0.04 * INTENSITY;
    const n4 = Math.sin(t * 12 - t_ * 0.3) * 0.10 * INTENSITY;
    heights.push(Math.max(0, bell * (0.75 + n1 + n2 + n3 + n4)));
  }

  const topPts = xs.map((x, i) => ({ x, y: CENTER_Y - heights[i] * REACH }));
  const botPts = xs.map((x, i) => ({ x, y: CENTER_Y + heights[i] * REACH }));

  const topCurve = catmullRom(topPts);
  const botCurve = catmullRom([...botPts].reverse());
  const botContinued = "L" + botCurve.substring(1);

  return `${topCurve} ${botContinued} Z`;
}
