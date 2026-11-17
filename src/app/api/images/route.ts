import { ImageMeta } from '../../../types';

const CREDIT =
  'NASA, ESA, Benjamin Williams (UWashington), Zhuo Chen (UWashington), L. Clifton Johnson (Northwestern); Image Processing: Joseph DePasquale (STScI)';

export const images: ImageMeta[] = [
  {
    id: 'hubble-mosaic',
    name: 'Andromeda Galaxy',
    mission: 'Hubble',
    timestamp: '2025-01-16',
    width: 10552,
    height: 2468,
    tileSize: 256,
    minLevel: 0,
    maxLevel: 6,
    credit: CREDIT,
  },
  {
    id: 'hubble-mosaic-high',
    name: 'Andromeda Galaxy',
    mission: 'Hubble',
    timestamp: '2025-01-16',
    width: 42208,
    height: 9870,
    tileSize: 256,
    minLevel: 0,
    maxLevel: 6,
    credit: CREDIT,
  },
];

export async function GET() {
  return Response.json(images);
}