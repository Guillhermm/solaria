// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import SpectralGallery from "./SpectralGallery";

const images = [
  { id: "a", title: "First", url: "/a.jpg" },
  { id: "b", title: "Second", url: "/b.jpg" },
];

afterEach(cleanup);

describe("SpectralGallery", () => {
  it("has no filter mode buttons", () => {
    render(<SpectralGallery title="Gallery" images={images} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(document.querySelector("[class*='mode-']")).toBeNull();
  });

  it("shows the image picked from the thumbnails", () => {
    render(<SpectralGallery title="Gallery" images={images} />);
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("First");
    fireEvent.click(screen.getAllByAltText("Second")[0]);
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("Second");
  });
});
