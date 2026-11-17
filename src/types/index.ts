export interface ImageMeta {
  id: string;
  name: string;
  mission: string;
  timestamp: string;
  width: number;
  height: number;
  tileSize: number;
  minLevel: number;
  maxLevel: number;
  credit: string;
}

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
  id: string;
  initialFlags?: Flag[];
  onFlagsChange?: (flags: Flag[]) => void;
}
