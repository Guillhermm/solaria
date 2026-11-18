import type { ControlPoint, Similarity } from "./types";

export interface Point {
  x: number;
  y: number;
}

export const MIN_CONTROL_POINTS = 6;

const RAD = Math.PI / 180;

export const applySimilarity = (s: Similarity, p: Point): Point => {
  const cos = s.scale * Math.cos(s.rotationDeg * RAD);
  const sin = s.scale * Math.sin(s.rotationDeg * RAD);
  return { x: cos * p.x - sin * p.y + s.tx, y: sin * p.x + cos * p.y + s.ty };
};

// Closed-form least squares in complex numbers: with the means removed,
// a = sum(q * conj(p)) / sum(|p|^2), so scale = |a| and the rotation is arg(a).
export const fitSimilarity = (points: ControlPoint[]): Similarity => {
  if (points.length < 2) throw new Error(`a similarity needs at least 2 control points, got ${points.length}`);
  const n = points.length;
  const mean = (pick: (c: ControlPoint) => Point) => ({
    x: points.reduce((sum, c) => sum + pick(c).x, 0) / n,
    y: points.reduce((sum, c) => sum + pick(c).y, 0) / n,
  });
  const pm = mean((c) => c.moving);
  const qm = mean((c) => c.reference);
  let re = 0;
  let im = 0;
  let norm = 0;
  for (const { moving, reference } of points) {
    const px = moving.x - pm.x;
    const py = moving.y - pm.y;
    const qx = reference.x - qm.x;
    const qy = reference.y - qm.y;
    re += qx * px + qy * py;
    im += qy * px - qx * py;
    norm += px * px + py * py;
  }
  if (norm === 0) throw new Error("the moving control points all coincide");
  const ar = re / norm;
  const ai = im / norm;
  return {
    scale: Math.hypot(ar, ai),
    rotationDeg: Math.atan2(ai, ar) / RAD,
    tx: qm.x - (ar * pm.x - ai * pm.y),
    ty: qm.y - (ai * pm.x + ar * pm.y),
  };
};

// Distances in reference pixels between where each moving point lands and where it should.
export const residuals = (s: Similarity, points: ControlPoint[]) => {
  const perPoint = points.map((c) => {
    const q = applySimilarity(s, c.moving);
    return Math.hypot(q.x - c.reference.x, q.y - c.reference.y);
  });
  const rms = perPoint.length ? Math.sqrt(perPoint.reduce((sum, d) => sum + d * d, 0) / perPoint.length) : 0;
  return { rms, max: Math.max(0, ...perPoint), perPoint };
};

export const invertSimilarity = (s: Similarity): Similarity => {
  const scale = 1 / s.scale;
  const back = applySimilarity({ scale, rotationDeg: -s.rotationDeg, tx: 0, ty: 0 }, { x: s.tx, y: s.ty });
  return { scale, rotationDeg: -s.rotationDeg, tx: -back.x, ty: -back.y };
};
