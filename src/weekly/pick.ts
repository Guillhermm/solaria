const DAY_MS = 86_400_000;

const parse = (date: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN;
  if (!m || Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== date) throw new Error(`not a date as YYYY-MM-DD: ${JSON.stringify(date)}`);
  return t;
};

// ISO 8601: weeks start on Monday, and week 1 holds the year's first Thursday.
export const isoWeek = (date: string) => {
  const t = parse(date);
  const weekday = (new Date(t).getUTCDay() + 6) % 7; // Monday 0
  const thursday = new Date(t + (3 - weekday) * DAY_MS);
  const year = thursday.getUTCFullYear();
  const week = Math.floor((thursday.getTime() - Date.UTC(year, 0, 1)) / DAY_MS / 7) + 1;
  return { year, week };
};

// design.md 15.3, W3.
export const weeklyIndex = (week: number, n: number) => (week - 1) % n;

export const buildDate = (env: Record<string, string | undefined>, now: Date) => {
  const asked = env.SOLARIA_BUILD_DATE;
  if (asked === undefined || asked === "") return now.toISOString().slice(0, 10);
  try {
    parse(asked);
  } catch {
    throw new Error(`SOLARIA_BUILD_DATE must be a date as YYYY-MM-DD, got ${JSON.stringify(asked)}`);
  }
  return asked;
};
