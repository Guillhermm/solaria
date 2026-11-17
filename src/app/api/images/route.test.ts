import { describe, expect, it } from "vitest";
import { GET, images } from "./route";

describe("GET /api/images", () => {
  it("returns the image list as JSON", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(images);
  });
});
