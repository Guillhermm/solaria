export type KeyAction =
  | { kind: "zoom"; factor: number }
  | { kind: "pan"; dx: number; dy: number } // fractions of the visible width and height
  | { kind: "home" }
  | { kind: "fullscreen" };

interface KeyInput {
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

// design.md 7.1: + and - zoom 2x about the center, arrows pan 10 % of the view (Shift 50 %),
// 0 or Home fits the image, F toggles fullscreen. Browser shortcuts (Ctrl, Cmd, Alt) pass through.
export const keyAction = (e: KeyInput): KeyAction | null => {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  const step = e.shiftKey ? 0.5 : 0.1;
  switch (e.key) {
    case "+":
    case "=":
      return { kind: "zoom", factor: 2 };
    case "-":
    case "_":
      return { kind: "zoom", factor: 0.5 };
    case "ArrowLeft":
      return { kind: "pan", dx: -step, dy: 0 };
    case "ArrowRight":
      return { kind: "pan", dx: step, dy: 0 };
    case "ArrowUp":
      return { kind: "pan", dx: 0, dy: -step };
    case "ArrowDown":
      return { kind: "pan", dx: 0, dy: step };
    case "0":
    case "Home":
      return { kind: "home" };
    case "f":
    case "F":
      return { kind: "fullscreen" };
    default:
      return null;
  }
};

// What the live region says once the zoom settles: "Zoom 14.3×".
export const zoomAnnouncement = (z: number) => `Zoom ${z.toFixed(1)}×`;
