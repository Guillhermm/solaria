# Detail of the week: validation record (F-02)

Content: `data/weekly.json`. Checked on 2026-11-17. Each item points at a stop that is already
validated in its Journey; showing it on its own is a new context for that text, so the pool
was reviewed as a whole. Verdict: **approved** for the seven items below, with these changes.

| # | Item | Crop | Card changes |
|---|---|---|---|
| 1 | Andromeda, The bright center (stop 2) | stop field | color line |
| 2 | Andromeda, Dust lanes (stop 3) | stop field | color line |
| 3 | Sun, 171 Å, active region 13664 (stop 4) | stop field, band `aia-171` | none |
| 4 | Andromeda, The companion galaxy M32 (stop 4) | stop field | color line, new opening |
| 5 | Sun, 211 Å, active region 13664 (stop 5) | stop field, band `aia-211` | none |
| 6 | Andromeda, NGC 206 (stop 5) | stop field | color line |
| 7 | Andromeda, Toward single stars (stop 6) | 720 px field at full resolution of the tiled rendition (about 58.6×) | color line |

## Decisions

- **Active region 13664 (label) is out.** It repeats Sun stops 4 and 5 at the same place,
  which W2 of design.md 15.3 already excludes.
- **Color line.** Every Andromeda item carries one fixed line, quoted from the Andromeda
  Journey's first stop: "The colors are assigned to two filters, so this is not natural
  color." The image record's caveat says the same ("Colors are assigned to two filters, not
  natural color.").
- **Sun stop titles.** Stops 4 and 5 of the Sun Journey were "171 Å, the same view" and
  "211 Å, the same view", which only read right after stop 3. They are now "171 Å, active
  region 13664" and "211 Å, active region 13664", in the Journey and on the card.
- **M32 opening, card only.** "The small, fuzzy yellow patch to the upper left of the center
  is Messier 32" places it relative to the whole galaxy, which the crop does not show. On the
  card it reads "The small, fuzzy yellow patch at the center of this view, upper left of
  Andromeda's core, is Messier 32"; the rest of the text is unchanged. The Journey keeps its
  own wording.
- **Toward single stars at 1:1.** At the stop's own field the crop would draw from a coarser
  level and blur the point sources the text is about.
- **Credits** are the source records' lines, word for word.
