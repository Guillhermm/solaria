import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applySimilarity, fitSimilarity, MIN_CONTROL_POINTS, residuals } from "../src/content/registration";
import type { ControlPoint, Similarity } from "../src/content/types";

const DIRS = ["data/pairs", "data/staging/pairs", "data/mock/pairs"];

export interface RegisterResult {
  similarity: Similarity;
  residualPx: number;
  maxResidualPx: number;
  lines: string[];
}

export const register = (points: ControlPoint[]): RegisterResult => {
  if (points.length < MIN_CONTROL_POINTS) throw new Error(`need at least ${MIN_CONTROL_POINTS} control points, got ${points.length}`);
  const similarity = fitSimilarity(points);
  const r = residuals(similarity, points);
  const lines = points.map((c, i) => {
    const q = applySimilarity(similarity, c.moving);
    const ref = r.perPoint[i];
    return `${c.label.padEnd(10)} dx ${(q.x - c.reference.x).toFixed(2).padStart(7)}  dy ${(q.y - c.reference.y).toFixed(2).padStart(7)}  residual ${ref.toFixed(2)} reference px, ${(ref / similarity.scale).toFixed(2)} moving px`;
  });
  lines.push(
    `scale ${similarity.scale.toFixed(5)}  rotation ${similarity.rotationDeg.toFixed(4)} deg  translation (${similarity.tx.toFixed(2)}, ${similarity.ty.toFixed(2)})`,
    `RMS ${r.rms.toFixed(2)} px, worst ${r.max.toFixed(2)} px (reference pixels)`,
  );
  return { similarity, residualPx: r.rms, maxResidualPx: r.max, lines };
};

// Replaces only the fitted fields; everything written by hand stays as it is.
export const updatePair = (raw: Record<string, unknown>) => {
  const reg = raw.registration as Record<string, unknown> | undefined;
  if (!reg || reg.transform !== "similarity" || !Array.isArray(reg.controlPoints)) {
    throw new Error('registration.transform must be "similarity" with controlPoints');
  }
  const result = register(reg.controlPoints as ControlPoint[]);
  reg.similarity = result.similarity;
  reg.residualPx = result.residualPx;
  reg.maxResidualPx = result.maxResidualPx;
  return result;
};

const main = () => {
  const id = process.argv[2];
  if (!id) {
    console.error("Usage: tsx scripts/register-pair.ts <pairId>");
    process.exit(1);
  }
  const path = DIRS.map((d) => join(d, `${id}.json`)).find((p) => existsSync(p));
  if (!path) throw new Error(`no ${id}.json in ${DIRS.join(", ")}`);
  const raw = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  const result = updatePair(raw);
  writeFileSync(path, `${JSON.stringify(raw, null, 2)}\n`);
  for (const line of result.lines) console.log(line);
  console.log(`Wrote ${path}`);
};

if (process.argv[1]?.endsWith("register-pair.ts")) {
  try {
    main();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
