import { getContent } from "@/content/load";
import { resolveTileBase } from "@/content/tiles";
import { journeyImage, thumbnailFor } from "./seo";

// Home and About share the card of the first Journey, the one Home's hero opens on.
export const homeCard = () => {
  const content = getContent();
  const first = content.journeys[0];
  const image = first && journeyImage(content, first);
  return image ? thumbnailFor(resolveTileBase(process.env.TILE_BASE_URL), image) : undefined;
};
