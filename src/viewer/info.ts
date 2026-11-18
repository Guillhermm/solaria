import type { Claim, ImageManifest, Source } from "@/content/types";

export interface InfoField {
  label: string;
  values: string[];
  draft: boolean; // the claim is not yet verified or supported (dev mock content only)
}

export interface Info {
  title: string;
  fields: InfoField[];
  credit: string;
  sourceUrl: string;
  caveats: string[];
}

const field = <T>(label: string, claim: Claim<T> | undefined, values: (v: T) => string[]): InfoField[] => {
  if (!claim) return [];
  const list = values(claim.value).filter((v) => v !== "");
  return list.length ? [{ label, values: list, draft: claim.status === "unverified" }] : [];
};

const filters = (image: ImageManifest): InfoField[] => {
  const mapping = image.colorMapping.value;
  const colorOf = (bandId: string) =>
    mapping.kind === "per-band" ? mapping.entries.find((e) => e.bandId === bandId)?.color : undefined;
  const draft = image.bands.status === "unverified" || image.colorMapping.status === "unverified";
  const bands = image.bands.value.map((b) => {
    const color = colorOf(b.id);
    return color ? `${b.id} shown as ${color}` : b.id;
  });
  const whole =
    mapping.kind === "grayscale"
      ? ["Shown in grayscale"]
      : mapping.kind === "standard-colortable"
        ? [`Shown with the ${mapping.name} color table`]
        : [];
  const values = [...bands, ...whole];
  return values.length ? [{ label: image.bands.value.length > 1 ? "Filters" : "Filter", values, draft }] : [];
};

// Only what the manifest and its source record state, in this order. A field the manifest
// leaves out is left out here too, never filled with a placeholder.
export const infoFor = (image: ImageManifest, source: Source): Info => ({
  title: image.title,
  fields: [
    ...field("Target", image.target, (t) => [t.name]),
    ...field("Observatory", image.observatory, (o) => [o]),
    ...field(image.instruments.value.length > 1 ? "Cameras" : "Camera", image.instruments, (list) => list),
    ...filters(image),
    ...field("Observed", image.observedAt, (r) => [r.start === r.end ? r.start : `${r.start} to ${r.end}`]),
    ...field("Released", image.releasedAt, (d) => [d]),
  ],
  credit: source.credit,
  sourceUrl: source.pageUrl,
  caveats: image.caveats ?? [],
});
