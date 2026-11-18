import { orderJourneys } from "../../src/kiosk/kiosk";
import { existsSync, readdirSync, readFileSync } from "node:fs";

// The records of one kind as the end-to-end build loads them (src/content/load.ts): data/<kind>,
// then the science team's drafts in data/staging/<kind>, each by file name. Mocks are left out.
export const readContent = (kind: string) =>
  [`data/${kind}`, `data/staging/${kind}`]
    .filter((d) => existsSync(d))
    .flatMap((d) =>
      readdirSync(d)
        .filter((f) => f.endsWith(".json"))
        .sort()
        .map((f) => JSON.parse(readFileSync(`${d}/${f}`, "utf8"))),
    );

// The Journeys in Home's order (K5), as the app derives it from their images.
export const homeJourneys = () => orderJourneys(readContent("journeys"), readContent("images"));
