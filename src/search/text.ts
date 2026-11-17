// design.md 15.2, Q14: NFKD, combining marks removed, lowercase, words of a-z and 0-9.
const fold = (s: string) => s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

const WORD = /^[a-z0-9]+$/;

export const words = (text: string) => fold(text).split(/[^a-z0-9]+/).filter(Boolean);

export interface Segment {
  text: string;
  strong: boolean;
}

// Each character of the text as written, with what it folds to when it belongs to a word.
const pieces = (text: string) => [...text].map((ch) => ({ ch, folded: fold(ch) })).map((p) => ({ ...p, word: p.folded !== "" && WORD.test(p.folded) }));

// Q19: the part of each word that a query word prefixes, longest first, in the text as written.
export const marked = (text: string, query: readonly string[]): Segment[] => {
  const out: Segment[] = [];
  const push = (t: string, strong: boolean) => {
    const last = out[out.length - 1];
    if (last && last.strong === strong) last.text += t;
    else if (t) out.push({ text: t, strong });
  };
  const all = pieces(text);
  for (let i = 0; i < all.length; ) {
    if (!all[i].word) {
      push(all[i].ch, false);
      i++;
      continue;
    }
    let end = i;
    while (end < all.length && all[end].word) end++;
    const run = all.slice(i, end);
    const folded = run.map((p) => p.folded).join("");
    const hit = Math.max(0, ...query.filter((q) => folded.startsWith(q)).map((q) => q.length));
    let used = 0;
    for (const p of run) {
      push(p.ch, used < hit);
      used += p.folded.length;
    }
    i = end;
  }
  return out.length ? out : [{ text, strong: false }];
};
