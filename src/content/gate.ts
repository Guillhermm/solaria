import type { Claim, Content, Validation } from "./types";

const MIN_STOPS = 5;
const MAX_STOPS = 8;

const claimKeys = [
  "target", "observatory", "instruments", "bands", "colorMapping", "releasedAt", "productType",
  "observedAt", "processing", "pixelScale", "fieldOfView", "orientation",
] as const;

export const publishProblems = (content: Content): string[] => {
  const out: string[] = [];
  const review = (what: string, v: Validation) => {
    if (v.status !== "approved") out.push(`${what}: validation.status is "${v.status}", expected "approved"`);
  };
  const mock = (what: string, m: boolean) => {
    if (m) out.push(`${what}: mock content cannot be published`);
  };

  for (const s of content.sources) {
    mock(`source ${s.id}`, s.mock);
    review(`source ${s.id}`, s.validation);
  }
  const approvedImages = new Set<string>();
  for (const i of content.images) {
    const what = `image ${i.id}`;
    mock(what, i.mock);
    review(what, i.validation);
    if (i.validation.status === "approved") approvedImages.add(i.id);
    for (const k of claimKeys) {
      const c = i[k] as Claim<unknown> | undefined;
      if (c?.status === "unverified") out.push(`${what}: ${k} is unverified`);
    }
  }
  for (const j of content.journeys) {
    const what = `journey ${j.slug}`;
    mock(what, j.mock);
    review(what, j.validation);
    if (j.stops.length < MIN_STOPS || j.stops.length > MAX_STOPS) {
      out.push(`${what}: has ${j.stops.length} stops, expected ${MIN_STOPS} to ${MAX_STOPS}`);
    }
    if (!approvedImages.has(j.imageId)) out.push(`${what}: image "${j.imageId}" is not approved`);
    for (const s of j.stops) review(`${what} stop ${s.id}`, s.validation);
  }
  const groups = [
    ...content.pairs.map((g) => ({ what: `pair ${g.id}`, g })),
    ...content.bandSets.map((g) => ({ what: `band set ${g.id}`, g })),
  ];
  for (const { what, g } of groups) {
    mock(what, g.mock);
    review(what, g.validation);
    if (g.whatDiffers.trim() === "") out.push(`${what}: whatDiffers is empty`);
    for (const id of g.imageIds) {
      if (!approvedImages.has(id)) out.push(`${what}: image "${id}" is not approved`);
    }
  }
  return out;
};
