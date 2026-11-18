import type { ImageManifest } from "@/content/types";

// Deep Viewer types and interfaces
export interface ImageResolution {
  level: number;
  name: string;
  url: string;
  width: number;
}

export interface Flag {
  id: string;
  x: number;
  y: number;
  name: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface DeepViewerProps {
  title: string;
  image: ImageManifest;
  tileBaseUrl: string;
  initialFlags?: Flag[];
  onFlagsChange?: (flags: Flag[]) => void;
}
