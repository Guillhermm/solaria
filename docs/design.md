# Solaria relaunch: experience and visual direction

Status: Journeys concept approved on 2026-11-17. Visual direction C "Instrument" chosen on
2026-11-17, pending final mockup approval. Built so far: the tokens of 6.1 in
`src/styles/tokens.css`, the Geist fonts and the dark and light themes (V-01), and
Bootstrap replaced by CSS Modules (V-02), the header and footer (V-03), the Explore
viewer (X-01 to X-05), Story mode with the Andromeda Journey (S-01, 5.3, 5.4, 7.2), and Home
(L-01: 5.1, 5.2, 6.5). Home follows the content where the mockup differs: one published
Journey with seven stops, no filter chips or planned rows, and the lens aimed at stop 02 with
the stop's own zoom. The Home drift on phones is not built: the phone hero is the poster strip.
About (L-02) is built at `/about/`; the header links Journeys and About, and the footer links
About, Sources and credits, Accessibility, the code and the Space Apps entry.
Date: 2026-11-17. Target: solaria.zenus.systems.

## 1. Where we start (read from the repo)

- One long page: a heading, a paragraph, then three numbered tools stacked with dividers
  (`src/app/page.tsx`). Nothing connects them, nothing tells you why to look.
- Deep Viewer: OpenSeadragon over the Andromeda tile pyramid, a zoom number input, reset,
  fullscreen, a minimap. It works and it is the best thing in the app.
- Comparison Slider: two Webb images labeled "Before" and "After" with alt text "Image 1"
  and "Image 2". The user is not told what changed or why the two belong together.
- Spectral Gallery: "Infrared" and "UV" are CSS filters (`invert`, `hue-rotate`) applied
  to visible-light pictures (`globals.css` lines 183 to 214). That shows a false picture
  of the science and must go, whatever else we decide.
- `src/app/api/images/route.ts` lists a "Sun" image with mission "Hubble"; Hubble does not
  observe the Sun. All metadata goes through the science gate before relaunch.
- Look: Bootstrap defaults, a red accent borrowed from a Bootstrap button, a light page
  around a dark image. It reads as a hackathon form, which matches the maintainers' verdict.
- `react-leaflet` is installed and unused.

## 2. Concept: "Journeys into one image"

Solaria stops being a toolbox and becomes a small set of **Journeys**. A Journey is one
giant image with a short told path through it (5 to 8 stops), after which the same
viewer is yours to explore, compare and look at in other light.

The obvious version is a gallery of thumbnails and a viewer with buttons. It fails the
brief's real problem: a 2.5 gigapixel image has no "first thing to look at", so people
zoom twice, see noise and leave. A Journey solves that: it gives scale, a reason to zoom
and a reward at the bottom of the zoom ("this smudge is a star cluster 2.5 million light
years away; there are thousands like it in this frame"). Then it hands over control.

Three ideas carry it:

1. **The image is the page.** The viewer is full-bleed on every screen that shows an
   image. Text and controls float over it in small, translucent panels that move out of
   the way of the area being discussed.
2. **Story drives the camera.** On a Journey, scrolling (or Next) flies the camera to a
   stop. Free gestures are always live; touching the image pauses the story, a "Back to
   the story" pill resumes it. Telling never locks the user out of looking.
3. **Every view is a place.** The URL always holds the image, the mode and the viewport,
   so any view can be shared, bookmarked, or opened on a museum screen.

Modes on the same image, never separate pages: **Story**, **Explore**, **Compare**
(when a validated pair exists), **Light** (when validated bands exist).

## 3. Audiences and journeys

| Who | Context | What they need |
|---|---|---|
| Curious visitor | phone, from a shared link, 2 minutes | a "wow" in the first 5 seconds, a story they can thumb through one-handed |
| Student or teacher | laptop, class project | stops they can cite, a shareable view, plain credits |
| Museum kiosk | large touchscreen, no keyboard, walk-up | attract loop, big targets, auto-reset after idle |
| Researcher | desktop, keyboard | fast pan and zoom, coordinates readout, real band comparison, source links |

**J1, curious visitor (phone).** Opens the shared link `/andromeda?stop=4`. The image is
already on screen at stop 4 with its caption card at the bottom. Swipes up on the card:
stop 5 flies in. At the last stop: "Now it's yours. Pinch anywhere." Taps Share; the
current view is copied as a link.

**J2, first visit (laptop).** Home opens on the whole Andromeda panorama with the loupe
on the first stop, one line of copy and one button, "Begin at stop 01". Hovering the
stops aims the loupe. Below the fold, the Journeys index. Picks Andromeda, scrolls through the story, presses E to
explore, then Compare to wipe between two observations.

**J3, researcher.** Lands on `/andromeda?mode=explore`, uses keyboard zoom and arrow pan,
reads the pixel and sky coordinate readout (only once the science review validates the
transform), switches to Light to compare bands at the same viewport, copies the link
into notes. Opens "Source" for the original product page.

**J4, kiosk.** `/?kiosk=1`: no header links that leave the app, auto-plays the Journeys
as an attract loop, any touch takes control, 90 s idle returns to the loop with a 10 s
"Still exploring?" countdown.

## 4. Information architecture

```
/                      Home: hero with loupe and panorama strip, Journeys index
/[slug]                Image viewer; the slug is the image id (mode via ?mode=story|explore|compare|light;
                       explore, story and compare are built). A Journey slug (/andromeda) opens Story on
                       its image, ?mode=story&stop=N (N from 1), and Explore on the same page
                       viewport via ?x=&y=&z=  (image pixels; z is zoom relative to fit)
/about                 What Solaria is, credits, data sources, accessibility statement
```

No separate "tools" pages. Removing them is the main structural change.

## 5. Page-by-page

### 5.1 Home, desktop (1440 wide)

```
+--------------------------------------------------------------------------------+
| <> SOLARIA                                         JOURNEYS   ABOUT   [sun]    |  hairline under the bar
|                                                                                |
|  JOURNEY 01 / 04 . HUBBLE . PHAT+PHAST      |18 000 . . . |18 500 . . .        |  ruler, image px
|  Andromeda,                               - +----------------+  LOUPE . AIMED AT|
|  one stop at a time.                      : |[STOP 02]       |  02 / 06  [DRAFT]|
|  Hubble's largest Andromeda panorama...   : |      -+-       |  Just off the    |
|  +-----------+-----------------+          : |                |  center          |
|  | RELEASED  | RENDITION       |          - +----------------+  ZOOM | FIELD    |
|  | 2025-01-16| 42 208 x 9 870px|              \              \   CENTER X | Y  |
|  [ Begin at stop 01 -> ]  Explore freely      \              \ [GO TO STOP 02] |
|  0 . . . . |5 000 . . . . |10 000 . . . . |15 000 . . . . |20 000 . . . .      |  ruler over the strip
|  (whole panorama, full bleed)  [01]   [02]=view box    [05]       [06]         |  bracket stops, route
|  credit line                                                                   |
+--------------------------------------------------------------------------------+
|  Journeys                                     [ALL . 4] [READY . 1] [PLANNED . 3]
|  NO.  FRAME        JOURNEY                    SOURCE          SIZE, PX         |
|  01   [strip]      Andromeda                  Hubble          42 208 x 9 870 [Begin]
|  02   [tall box]   Pillars of Creation DRAFT  Hubble, Webb    8 423 x 14 589 Planned
|  03   [hatched]    The Sun in seven channels  SDO, HMI, AIA   to be checked  Planned
|  04   [hatched]    Mars: moving dunes DRAFT   MRO, HiRISE     to be checked  Planned
|  SHOWING 4 OF 4                 A journey joins once tiled and science reviewed |
+--------------------------------------------------------------------------------+
|  Reading the instrument: Stop, View box, Loupe, Zoom, Position                  |
|  footer: credit, About, Sources, Accessibility                                  |
+--------------------------------------------------------------------------------+
```

- The hero is the image twice: the whole panorama as a full-bleed strip along the bottom,
  and the loupe, a magnified square on one stop, tied to its view box on the strip by two
  leader lines. The loupe sits above the strip, never on it, so it hides nothing.
- Journey titles, stop titles and captions are placeholders marked Draft until the
  science review validates them.
- The Journeys index is a list, not a card grid, so it holds one entry or forty. Rows
  share one grid: number, frame thumbnail, title with status meta, source, size in
  pixels, action. The filter (All, Ready, Planned) shows counts; past 12 entries the list
  pages 12 at a time, and "Showing n of m" sits under it.
- The frame thumbnail follows the aspect-ratio rule (6.4): a slot of 10.5 by 4rem with the
  image contained at its true proportions. An image not yet tiled shows a hatched box at
  its true proportions when its size is verified, and a full hatched slot with
  "Not yet tiled" when it is not. A size is shown only when `docs/science/sources.md`
  verifies it; otherwise the row reads "Size to be checked".
- Only Ready rows carry the primary action. Planned rows show a neutral "Planned" tag.

### 5.2 Home, phone (390 wide)

```
+---------------------------+
| SOLARIA              [=]  |
|                           |
|   (live image, drifting)  |
|                           |
| Andromeda,                |
| one stop at a time.       |  2.5rem
| [ Begin at stop 01 -> ]   |  full width, 3rem tall
+---------------------------+
| Journeys   [All|Ready|..] |
| 01 [frame] Andromeda      |  one row per journey,
| 02 [frame] Pillars ...    |  meta on a second line
+---------------------------+
```

On the phone the loupe is not shown on Home (no hover, and the strip is too short to
aim); tapping a stop opens the Journey at that stop.

### 5.3 Journey, Story mode, desktop

```
+-------------------+------------------------------------------------------------+
| <- SOLARIA        | 18 000 . . . . |18 500 . . . . |19 000      (ruler, image px)|
|                   |4 000                                                       |
| HUBBLE . PHAT ... | . [credit]                           [STORY|EXPLORE] [^][o]|
| Andromeda Galaxy  | .                                                          |
| ROUTE   STOP 02/06| .                  +-          -+  STOP 02                 |
| ==|==|--|--|--|-- |4 500                    -+-       (bracket reticle)        |
| 01 The bright ... | .                  +-          -+                          |
|[02 Just off ...  ]| .                                                          |
|[  draft caption  ]| .  +-OVERVIEW------------------+                    [+]     |
| 03 A small ...    | .  | [strip with route, box]   |                    [-]     |
| 04 ...            | .  | ZOOM  CENTER X  Y   VIEW  |                    [[]]    |
| [<-] [Next: 03 ->]| .  +---------------------------+                            |
+-------------------+------------------------------------------------------------+
```

- Left column, 25rem: back and wordmark, mission line, Journey title, route progress
  (one segment per stop, amber for the current one), the stop list with the current stop
  expanded into its caption, Previous and Next at the bottom.
- The image fills the rest. Rulers run along the top and left edges and are labeled in
  image pixels. The current stop is an amber bracket reticle at the view center.
- The overview follows the aspect-ratio rule (6.4): a card at the bottom left for a wide
  image, a rail docked to the right edge for a tall one (artboard
  `C-Journey-Story-tall`, the Webb Pillars of Creation frame at 8 423 x 14 589 px).
- The readout under the overview shows only computed values (6.3).
- Scroll wheel advances stops only while the pointer is over the stop list; over the
  image, the wheel zooms. This avoids the classic scrollytelling conflict.
- Marker states: current stop amber, others white, both drawn as open brackets with a
  dark halo, so they never cover the feature.
- As built (S-01): the current stop's reticle sits on its marker, or at its view center
  when it has none, and grows to frame the marker's radius; markers never take a gesture
  from the image. A stop at the fit view (z = 1, the first and last Andromeda stops) has no
  marker on the image or the strip, since it shows the whole image. A flight stops at native
  zoom (one screen pixel per image pixel), so on a large screen a deep stop shows more
  around it instead of magnified pixels. While the story is
  paused on desktop, the "back to the story" pill takes the title bar's place (the column
  already holds the title), so it covers neither the overview nor the controls. Not built:
  the scroll wheel over the stop list advancing stops (the list itself scrolls when the
  window is short).

### 5.4 Journey, Story mode, phone

```
+---------------------------+
| <-  Andromeda        [..] |  [..] opens mode sheet
|                           |
|  (camera at stop 3,       |
|   feature in upper 60 %)  |
|          ( ring )         |
|                           |
+---------------------------+
| ---                       |  bottom sheet, peek 38 % height
| 3 / 6  Young star cluster |
| The blue knot here is ... |
| [<-]   o o * o o o   [->] |
+---------------------------+
```

- Swipe the sheet left or right to change stop; drag it down to peek (title only) and
  see the whole image; Next and Previous buttons do the same without a gesture
  (WCAG 2.5.7, dragging movements).
- Camera target uses the top 60 % of the screen as its frame.
- As built (S-01): the sheet holds the strip with the route, the progress, the stop's
  title, body (scrolling inside the card when long), sources, Previous and Next, and the
  full credit under them, within 50 % of the screen height; a long stop text scrolls
  inside the card, and a tall image's rail is capped at 7rem. The zoom buttons are hidden
  in Story on a phone (pinch and double-tap still zoom; Explore shows them). The handle
  folds it to the title. A gesture on the image folds
  it to the "back to the story" pill, with the credit still under it. Story and Explore
  switch from the top bar; the short image title leaves the phone bar on Journey pages to
  make room, and on pages that offer Compare once its switch is there. The camera frames the stop in the screen above the
  sheet's measured top (Sprint 8; it was a fixed 60 % before), and below the Light bar on a
  Journey through a band set; in Explore and Light on a phone the fit also ends at the sheet. Near an image edge the view
  constraint can move the center, never the zoom.

### 5.5 Journey, Explore mode

```
+--------------------------------------------------------------------------------+
| <- SOLARIA   Andromeda Galaxy           Story  [Explore]  Compare  Light  [^] |
|                                                                                |
|                       (image, nothing over the center)                         |
|                                                                                |
|                                                                                |
|  [i] About this image                                     +-------+            |
|  CENTER X 19 199  Y 4 926  ZOOM 14.3x  (mono)             |overview| [-][+][[]]|
+--------------------------------------------------------------------------------+
```

- Controls cluster bottom right, readouts bottom left, both on glass, both fade to 0
  after 3 s without input and return on any pointer move or key (never fade while
  focused).
- "About this image" opens a side sheet: title, mission, instrument, date, what the
  colors mean, credit, link to the source page. Every field validated by the science review.
- The zoom input (the current number box) becomes a slider in a popover plus readout;
  typing a number stays possible for researchers.

### 5.6 Compare mode

```
+--------------------------------------------------------------------------------+
|  2014, Hubble WFC3           ||           2022, Webb NIRCam   (labels follow)  |
|                             ||                                                 |
|        (left image)       [<||>]        (right image)                          |
|                             ||                                                 |
|                                                                                |
|  [Wipe] [Side by side] [Blink]               What differs?  (opens note)       |
+--------------------------------------------------------------------------------+
```

- Both images live in one OpenSeadragon viewer as two tiled images, so pan and zoom are
  shared by construction; the top one is clipped at the divider. A wipe stays valid at
  any zoom, which the current flat-image slider cannot do.
- Three layouts: Wipe (default), Side by side (two synchronized viewers, desktop only),
  Blink (toggle every 800 ms, off under reduced motion, then manual toggle only).
- The pair always carries a one-paragraph "What differs?" note. A pair without a
  validated note does not ship: comparing images that differ in instrument, band and
  resolution needs explaining or it misleads.
- Phone: Wipe only, divider handle 3rem, labels collapse to "Left: 2014" chips.

### 5.7 Light mode (replaces Spectral Gallery)

```
+--------------------------------------------------------------------------------+
|                                                                                |
|                   (same target, same viewport, band 3 shown)                   |
|                                                                                |
|  +--------------------------------------------------------------------------+  |
|  | Visible   |  Extreme UV   |   Extreme UV    ...                          |  |
|  |  6173 Å   |    171 Å      |     94 Å                                     |  |
|  |----o-------------*---------------o-------------------o----------------   |  |
|  | Shows: the corona at about 600,000 K             (from validated note)   |  |
|  +--------------------------------------------------------------------------+  |
+--------------------------------------------------------------------------------+
```

- Real registered images of one target in different bands, never a filter on one image.
  Candidates for product and science to choose from: the Sun from SDO's AIA and HMI
  channels, or a target released with matching Webb NIRCam and MIRI views. Each needs
  validated wavelengths, registration and the "Shows" sentence.
- The rail is ordered by wavelength. Each stop is labeled in text (band name plus
  wavelength); the rail itself is neutral gray with a tick per band. No rainbow strip:
  a rainbow implies visible color for bands that have none.
- Dragging between two stops crossfades between their images; keyboard Left and Right
  jump band by band.
- If an image is shown in false color, the "Shows" line says so in words.

### 5.8 States

| State | What the user sees | Copy |
|---|---|---|
| Loading first tiles | the lowest pyramid level, blurred 8px, sharpening as tiles land; a 2px progress line under the top bar | none |
| Slow network (> 4 s) | small glass toast bottom center | "Still loading the detail. You can start moving around." |
| Tile errors | missing tiles stay at the lower level, no broken icons; after 10 failures a toast | "Some detail could not load. Retry" |
| Image metadata failed | full-screen dark state with the Journey poster image | "This journey could not load. Check your connection and try again. [Retry]" |
| Unknown journey | 404 over a dim starfield poster | "Nothing at these coordinates. [Back to journeys]" |
| No Compare / Light data | mode hidden from the switcher, never disabled-and-unexplained | none |
| Reduced motion | camera cuts with a 200 ms crossfade, no home drift, no pulse (built in S-02 as a cut with the image fading up from 20 % opacity in 200 ms; the route appears without drawing) | none |
| Kiosk idle | countdown sheet | "Still exploring? Returning to the start in 10 s. [Keep exploring]" |

## 6. Visual language: Instrument

The interface reads as a precise instrument laid over the image: hairline rulers labeled
in image pixels, open bracket markers, a route line between stops, and monospace
readouts. Precision carries the modern, technical feel; the image keeps all the color.

**Dark-first, with a real light theme.** Space images sit on black; a light frame around
them lowers perceived contrast and makes the image look washed out. The viewer canvas is
always near-black in both themes (like a photo editor), and only the chrome, lists and
the About page switch. Rulers, markers and readouts over the viewer always use the dark
values. The light theme follows the system setting and the toggle.

**One accent, for action only.** A warm solar amber marks buttons, focus, selection and
the current stop. It is never used on data, so it never competes with the image's own
colors (one hue cannot mean both "action" and "data").

**Two faces from one family.** Geist runs titles and interface text; Geist Mono, with
tabular figures, runs labels, rulers and every number. Titles are set tight and
semibold; labels are small, uppercase and tracked.

### 6.1 Tokens (draft)

Contrast ratios computed against WCAG 2.x relative luminance on `--ground`; perceived
contrast over bright image areas still to be judged on the final mockup.

```css
:root {                                    /* dark, default */
  --ground:        #07090D;                /* page and viewer canvas */
  --surface:       #0C0F16;                /* panels, current stop row, ruler bars on Home */
  --surface-2:     #1A1F2A;                /* small diagram fills */
  --glass:         rgb(10 13 19 / 0.78);   /* overlays on the image; backdrop-filter: blur(1.25rem) saturate(1.3) */
  --ruler-bar:     rgb(7 9 13 / 0.72);     /* ruler background over the viewer */
  --hairline:      rgb(255 255 255 / 0.18);/* rulers, grids, panel and row borders, minor ticks */
  --hairline-soft: rgb(255 255 255 / 0.10);/* header rule, dividers in the stop list */
  --tick-major:    rgb(255 255 255 / 0.55);
  --text:          #E9ECF2;                /* 16.8:1 */
  --text-2:        #C9CED8;                /* body copy, 12.6:1 */
  --text-muted:    #9BA3B4;                /* labels, 7.9:1 */
  --accent:        #FFB547;                /* 11.3:1; text on accent uses --ground */
  --accent-press:  #E89A22;
  --marker:        #FFFFFF;                /* brackets, view box, crosshair */
  --halo:          rgb(0 0 0 / 0.55);      /* 1px outline or 3px under-stroke on everything drawn over the image */
  --danger:        #FF7A6B;
  --viewer-canvas: #07090D;                /* same in both themes */
  color-scheme: dark;
}
[data-theme="light"] {
  --ground:        #F7F6F2;
  --surface:       #FFFFFF;
  --surface-2:     #ECEAE4;
  --glass:         rgb(247 246 242 / 0.86);
  --hairline:      rgb(17 20 26 / 0.18);
  --hairline-soft: rgb(17 20 26 / 0.10);
  --tick-major:    rgb(17 20 26 / 0.55);
  --text:          #11141A;                /* 17.1:1 */
  --text-2:        #2E3440;
  --text-muted:    #5A6272;                /* 5.7:1 */
  --accent:        #8F5200;                /* 5.8:1 on ground; white on it 6.2:1 */
  --accent-press:  #6F3F00;
  --danger:        #B3261E;
  color-scheme: light;
}
```

Data overlays, if any are added later (density heatmaps, altimetry): viridis or cividis
only, always with a labeled legend; never the accent, never a rainbow.

**Type** (self-hosted with `next/font`, no runtime font requests):

| Role | Face | Size / line height | Use |
|---|---|---|---|
| Display XL | Geist 600, -0.035em | 3.75rem / 1.02 (phone 2.5rem) | Home headline |
| Display | Geist 600, -0.035em | 2.375rem / 1.05 (phone 1.75rem) | Journey title |
| Section | Geist 600, -0.03em | 2.5rem / 1.1 | Home section headings |
| Title | Geist 600, -0.02em | 1.375rem / 1.2 | stop heading, list row title |
| Body | Geist 400 | 1rem / 1.55, max 60ch (captions 42ch) | captions, intro |
| Label | Geist Mono 400, +0.08em, uppercase | 0.6875rem / 1.2 (rulers and readout names 0.625rem) | eyebrows, mode switch, tags |
| Numeric | Geist Mono, tabular figures | 0.8125rem (tables 0.875rem) | zoom, coordinates, sizes |

Thousands use a narrow no-break space (U+202F): "42 208", never a comma.

**Spacing**: 0.25rem steps: 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6rem. Viewer overlays sit
1rem from the edges plus the safe-area insets; one side gutter, `--gutter` in `tokens.css` (1rem, 2.5rem from 48rem, 4rem from 75rem), is
shared by the header, the Home sections and the footer; About keeps its centered column.

**Radius**: 0.125rem for buttons, tags and segmented controls; 0.25rem for panels and
glass. Markers are square. No pills.

**Elevation**: no drop shadows. Panels separate by glass plus hairline; everything drawn
over the image (markers, view box, leader lines, crosshair) carries the dark halo.

**Motion**

| Token | Value | Use |
|---|---|---|
| `--dur-fast` | 120 ms | hover, press |
| `--dur-base` | 200 ms | toggles, fades, focus ring, readouts settling, loupe content |
| `--dur-panel` | 320 ms | sheets, panels entering |
| `--dur-route` | 600 ms | route line drawing from one stop to the next |
| `--dur-flight` | 1200 to 1800 ms, scaled by zoom distance | camera flights between stops |
| `--ease-standard` | cubic-bezier(0.2, 0, 0, 1) | everything UI |
| `--ease-exit` | cubic-bezier(0.3, 0, 1, 1) | elements leaving |

Camera flights zoom out, pan, zoom in when the stops are far apart, so the user keeps
their place; close stops pan directly. Under `prefers-reduced-motion` every flight
becomes a 200 ms crossfade cut, the route appears without drawing, readouts jump to
their value and the loupe swaps content without a fade.

**Iconography**: one outline icon set, 1.5 stroke, 1.125rem in 2.75rem hit areas (Lucide
fits).

**Brand**: wordmark "SOLARIA" in Geist 600 with 0.3em tracking, after a small rotated
square. No NASA insignia or NASA-like marks anywhere (NASA's brand guidelines restrict
them). Credits are text.

### 6.2 Instrument elements

| Element | Spec |
|---|---|
| Ruler | Opaque bar on `--ground` along the top (1.375rem) and left (2.75rem, so horizontal labels fit; accepted deviation, Sprint 4) edges of an image view, hairline on its inner edge; the fit view leaves both clear. Hidden on phones. Labels in image pixels. Labeled step is 1, 2 or 5 times a power of ten, chosen so labels sit 7 to 12rem apart; 4 or 5 minor ticks per step. Major tick 8px at `--tick-major`, minor 4px at `--hairline`. |
| Stop marker | Open square bracket, 1.25rem, arms 7px, 1.5px stroke, white; the current stop 1.625rem in amber. Two-digit number on a tag beside it (amber tag for the current stop). Hit area 2.75rem. |
| Route | Way ahead: 1px white at 0.55, dashed 3 4, over a 3px halo. Travelled: 1.5px amber over a 3.5px halo. |
| View box | 1px white rectangle with a 1px halo: the part of the image on screen, or in the loupe. |
| Reticle | Amber bracket, 5.5rem, at the view center, with four white ticks outside it, a center dot and a "STOP 02" tag. Story only. |
| Draft tag | 1px dashed border at 0.45, Label type. Every text not yet validated carries it. |
| Placeholder | Field hatched with 1px lines at 135 degrees, labeled "Placeholder". Mockups only. |

### 6.3 Readouts show computed values only

A readout states only what the app computes from the image file and the viewport:

- **Zoom**: current scale divided by the scale at which the whole image fits the viewer,
  one decimal, "14.3×". Andromeda Home loupe: 42 208 / 2 960 = 14.3×. Tall frame in a
  1 040 by 900 px viewer: fit scale min(1 040 / 8 423, 900 / 14 589) = 0.0617; at 0.8
  screen px per image px the zoom is 13.0×.
- **Center x, Center y**: the image pixel at the view center, counted from the top-left
  corner of the image file, integers.
- **View** (viewer) or **Field** (loupe): image pixels across and down.
- **Size**: the pixel size of the file, only as verified in `docs/science/sources.md`.

Not shown until the science review validates the transform and the claim: sky
coordinates, physical scale bars, distances, and any date other than the verified
release date. Readouts update from a ref, one per animation frame at most; the live
region is debounced to 500 ms.

### 6.4 Aspect-ratio rule

Andromeda launches first, but nothing in the layout assumes its 4.28 to 1 shape. With
r = width / height of the image file:

| Shape | Overview on Home | Overview in Story and Explore |
|---|---|---|
| Wide, r of 2 or more | horizontal strip, full width, height = width / r capped at 24rem (beyond the cap the image is contained and centered, rulers span only the image) | card at the bottom left, image 21.5rem wide |
| Tall, r of 0.8 or less | vertical rail on the right of the hero at full hero height, copy on the left, loupe between them with leader lines to the rail | rail docked to the right edge under the mode switch, image 13rem wide, capped at 60 % of the viewport height (above the cap the rail narrows) |
| Near square, between | card, image contained in a 15rem square | same card at the bottom left |

- Markers, route and view box are placed in normalized image coordinates
  (u = x / W, v = y / H) times the drawn overview size. Stop data stores image pixels,
  never overview pixels.
- Markers keep a fixed screen size on any overview. A number tag flips to the other side
  of its marker when it would leave the overview.
- Rulers on the viewer label image pixels on both axes for every image.
- Journeys index thumbnails: a fixed slot with the image contained at true proportions.
- The loupe stays square; its view box on the overview is square in image pixels.
- Mockup `C-Journey-Story-tall` shows the tall case with the Webb Pillars of Creation
  frame, 8 423 by 14 589 px (r = 0.58), as a labeled placeholder.

### 6.5 Loupe

- A square magnified view of one stop beside the panorama strip on Home, 21.25rem on
  desktop. Rulers on its top and left edges label image pixels; an amber bracket frame
  sits 0.375rem outside its corners (the current-stop marker at loupe scale); a white
  crosshair marks its center. Two leader lines (1px white at 0.7 over a 3px halo) run
  from its bottom corners to the corners of its view box on the strip.
- Beside it, a readout panel: stop number and title with its Draft tag, Zoom, Field,
  Center x, Center y, and "Go to stop".
- The loupe never sits on the overview, so it hides no part of the image being aimed at.
- Hover or keyboard focus on a stop marker aims the loupe there: content and readouts
  cross-fade in 200 ms and the leader lines move to the new view box; the frame itself
  does not move. Leaving the strip returns the loupe to the current stop after 600 ms.
  Click or Enter opens the Journey at that stop.
- Stop markers form one roving-tabindex group: Tab enters at the current stop, Left and
  Right step along the route order. The readout panel is a polite live region ("Stop 3,
  zoom 14.3×"), debounced to 500 ms.
- The loupe draws from the same tile pyramid as the viewer, never from a separate crop.
- Not on phone Home (no hover, strip too short to aim): a tap on a stop opens the Journey.

## 7. Interaction specs

### 7.1 Viewer (all modes)

| Input | Action |
|---|---|
| Drag / one-finger drag | pan |
| Wheel, pinch, double-click / double-tap | zoom about the pointer |
| `+` `-` | zoom in or out by 2x about center |
| Arrow keys | pan 10 % of the viewport (Shift: 50 %) |
| `0` or Home | fit image |
| `F` | fullscreen |
| `E`, `S`, `C`, `L` | Explore, Story, Compare, Light (when available) |
| `?` | shortcut sheet |
| Esc | close sheet or popover, else exit fullscreen |

- The viewer canvas is focusable with a visible 2px accent ring inset 2px, labeled
  "Andromeda Galaxy image viewer. Use arrow keys to pan, plus and minus to zoom."
  As built: the ring is a 2px accent frame drawn above the tiles, along the edges of the
  visible image (inside the rulers and the Story column), on keyboard focus only.
- A visually hidden live region announces the stop title on arrival and "Zoom 38x"
  after zoom settles (debounced 500 ms), never on every frame.
- URL updates with `history.replaceState`, debounced 400 ms after the viewport settles.
- Overview (strip, rail or card, by 6.4): toggle on desktop, inside the bottom sheet on
  phone; click or tap to jump.
- Controls: 2.75rem targets (beyond WCAG 2.5.8's 24px minimum, since this is touch-first).

### 7.2 Story

- Stops are data: `{ id, title, body, viewport: {x, y, z}, marker?: {x, y, r} }`, one JSON
  per Journey, reviewed by the science review before merge.
- Next / Previous: buttons, dots, swipe on the card, `J` / `K` and Page Down / Page Up.
- User gesture on the image during Story: the story pauses, the card collapses to a pill
  "Stop 3 of 6, back to the story" which flies back to the stop.
- Last stop shows "Explore freely" as the primary action.

### 7.3 Compare divider

- Implements the WAI-ARIA slider pattern: `role="slider"`, `aria-valuenow` 0 to 100,
  `aria-valuetext` "62 % showing 2022 Webb image", Left and Right 1 %, Shift 10 %,
  Home and End.
- Pointer: drag the handle or click anywhere on the bar strip at the bottom; dragging the
  image itself pans, never moves the divider.
- Labels sit at the top of each side, 1rem from the divider, and hide when their side is
  under 15 % wide.

### 7.4 Light rail

- Also a slider pattern, with discrete stops per band plus continuous crossfade between
  them for pointer users; keyboard moves stop to stop. `aria-valuetext`: "171 Å, extreme
  ultraviolet". Wavelength units as the source states them.
- As built (G-01, Sprint 8): the rail sits in a bar where the compare bar does (between the
  overview and the zoom controls on desktop, under the top bar below 64rem). Stops are equal
  columns in `imageIds` order, each labeled with the wavelength as the manifest states it
  ("171 Å"); the current stop also names its region in small capitals (hidden on a phone).
  Under the title, "Shows" and the band's validated note. The spoken value spells the unit
  out: "171 angstroms, extreme ultraviolet". Left, Right, Up, Down, Page Up and Page Down move one band; Home and End go to the ends. A pointer
  can press anywhere on the rail, labels included, and drags a continuous position; on release
  it settles on the nearer stop in 160 ms (at once under reduced motion), so the URL and the
  slider value always name one band. Under the rail: the shown band's image title, the "What
  differs?" note when the set has one, and the credit of each band on screen (in the sheet on
  a phone). About this image shows the nearest band's image. `L` opens Light, `E` Explore.
- Journeys through a band set (G-04): the same bar in Story and Explore; a stop's band
  crossfades in over 700 ms with the flight (a cut under reduced motion). In Story on a phone
  the bar keeps only the rail, and the view frames the stop below it.

## 8. Accessibility (WCAG 2.2 AA)

- Every image has a text alternative written as a description of what is visible, plus
  the Journey text itself as the long description; the viewer is not the only way to get
  the content (the story text reads fine without the image).
- Visible focus on every control (2.4.11, 2.4.13 target), focus never hidden under an
  overlay; overlays that auto-fade stay visible while anything inside has focus.
- Dragging alternatives for divider, rail and sheet (2.5.7).
- Color never alone: modes, bands and compare sides all carry text labels.
- Reduced motion variant for every animation (listed in 6.1 and 5.8).
- Kiosk: everything reachable by touch alone; no hover-only content.

## 9. Performance targets

- LCP under 2.5 s on a mid phone: the home hero renders a static poster JPEG (the lowest
  useful level, about 150 KB, preloaded) and only then starts OpenSeadragon on top of it.
- CLS below 0.1 (web.dev's "good" threshold), and 0 on Home and the viewer: the viewer
  reserves the full viewport from the first paint. Decided on 2026-11-17: fonts keep
  `font-display: swap`, so text pages such as About may shift slightly when Geist arrives.
- INP under 200 ms: no React state update per viewport frame (the current `setScale` on
  every `viewport-change` re-renders the component during pans); update readouts through
  a ref or throttle to one per animation frame.
- Load OpenSeadragon only on routes with a viewer (dynamic import).

Measured on 2026-11-17 (L-05) against the static build on localhost, gzip on, in Playwright
with Lighthouse's mobile throttling applied as DevTools throttling (390 by 844 at 3x, 4x CPU
slowdown, 150 ms round trip, 1.6 Mbps down): Home LCP 1.4 s (the poster), CLS 0; About LCP
0.7 s, CLS 0.016; worst interaction 72 ms (theme toggle, phone) and 40 ms (lens aimed by
keyboard, desktop at 4x CPU). Home loads no OpenSeadragon: the lens is plain tiles. Phones
get `poster.jpg`, pyramid level 1 stitched by `generate-tiles` (1319 by 308, 46 KB);
before it, the 2048 px preview shared the line with the fonts and scripts and Home LCP was
2.5 s. The viewer pages (`/andromeda/`, `/andromeda-phat-phast-2025/`) measure CLS 0. About's
0.016 comes from the swap from the metric-matched Arial fallback to Geist, which rewraps a
paragraph; it is within the target. The fallback is already metric-matched (`next/font/local` writes
`size-adjust: 106.28%` on Arial), and no single `size-adjust` from 104 to 108 % keeps every
About paragraph on the same lines from 320 to 430 px wide, so a closer fallback cannot close it.
Closing it would need `font-display: optional` (a first visit on a slow line may then keep
Arial); the maintainers chose to keep `swap`.
`tests/e2e/quality.spec.ts` checks all of this, and axe-core (WCAG 2.2 A and AA tags) on
Home and About at phone and desktop width in both themes.

## 10. What to drop, keep, add

| Item | Decision | Why |
|---|---|---|
| react-bootstrap, bootstrap CSS | drop | every look we want fights its defaults; tokens plus CSS Modules (built into Next) cover the rest |
| CSS filter "Infrared" and "UV" | drop now | it shows false science |
| react-leaflet | drop | unused |
| @img-comparison-slider/react | drop after Compare is rebuilt in OpenSeadragon | cannot keep zoom in sync |
| OpenSeadragon | keep | mature, accessible enough, already working with the tiles |
| react-icons | keep one family or swap for Lucide | consistency |
| Tailwind or a component library | do not add | not needed for one engineer with a token file |
| Scrollytelling library | do not add | stops are driven by buttons and card scroll, not page scroll |

## 11. Build increments (each leaves the app working)

1. **Base**: tokens, fonts, new header and footer, Bootstrap removed, CSS filter
   modes removed, theme toggle kept. Same three tools, new skin.
2. **Viewer as page**: `/[slug]` (the image id) with full-bleed Explore mode, overlay controls, URL
   viewport state, keyboard and live region, loading and error states. Home links to it.
3. **Story**: stops JSON, caption card and bottom sheet, camera flights, reduced motion.
   One Journey (Andromeda) with validated text.
4. **Home**: hero with poster, panorama strip and loupe, Journeys index.
5. **Compare** in OpenSeadragon with one validated pair.
6. **Light** with one validated band set.
7. **Kiosk** flag and attract loop.

Before increment 1 is built: a mockup of Home and Journey Story (desktop and phone, dark
and light) rendered to screenshots for the maintainer to approve.

## 12. References and what each gave us

Comparable products
- ESA/Hubble zoomable Andromeda, https://esahubble.org/images/heic1502a/zoomable/ : the
  full-bleed, chrome-free deep zoom is the right baseline; it also shows the gap we fill,
  since it offers no guidance once you are in.
- ESA/Webb and STScI image releases, https://esawebb.org/images/ and
  https://webbtelescope.org/images : release pages pair an image with a compare slider
  and a "what you are seeing" paragraph; we take the paired explanation.
- Google Arts & Culture gigapixel views, https://artsandculture.google.com : the guided
  "zoom into the detail" stories over one huge image are the closest model for Story mode.
- NASA Eyes, https://eyes.nasa.gov : camera flights that keep orientation, and dark,
  translucent chrome. Premium feel comes from motion continuity, not decoration.
- NASA Worldview, https://worldview.earthdata.nasa.gov : URL holds the full view state,
  so every view is shareable; we adopt that rule.
- Solar System Treks, https://trek.nasa.gov : rich research tools, but tool-dense
  panels show what to avoid for the public audience; we keep research tools behind modes.
- ESASky, https://sky.esa.int : multi-wavelength switching on the same sky region, the
  model for Light mode (real data per band).
- OpenSeadragon, https://openseadragon.github.io : multi-image and clip support makes a
  zoom-synced Compare possible without a second library.
- The Pudding, https://pudding.cool : text short enough per step that the visual stays
  the subject.

Guidelines and research
- Material Design 3 motion, https://m3.material.io/styles/motion/easing-and-duration :
  easing curve and duration scale.
- Material 3 color contrast, https://m3.material.io/foundations/designing/color-contrast
- Apple Human Interface Guidelines, https://developer.apple.com/design/human-interface-guidelines/ :
  bottom sheets with detents and 44pt targets (our 2.75rem).
- IBM Carbon data visualization palettes, https://carbondesignsystem.com/data-visualization/color-palettes/ :
  keep data color separate from interface color.
- GOV.UK Design System, https://design-system.service.gov.uk , and USWDS,
  https://designsystem.digital.gov : plain error and loading copy that says what to do.
- Datawrapper on color, https://blog.datawrapper.de/colors/ ; ColorBrewer,
  https://colorbrewer2.org ; viridis, https://bids.github.io/colormap/ ; FT Visual
  Vocabulary, https://github.com/ft-interactive/chart-doctor/tree/master/visual-vocabulary :
  ordered ramps only, no rainbow, label instead of legend where possible.
- Nielsen Norman Group, https://www.nngroup.com/articles/scrolling-and-attention/ and
  https://www.nngroup.com/articles/progressive-disclosure/ : attention concentrates
  above the fold; reveal research tools only on demand.
- WAI-ARIA Authoring Practices slider, https://www.w3.org/WAI/ARIA/apg/patterns/slider/
- WCAG 2.2 target size, https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html ;
  dragging movements, https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html ;
  focus appearance, https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- web.dev reduced motion, https://web.dev/articles/prefers-reduced-motion ; Core Web
  Vitals, https://web.dev/articles/vitals
- View Transitions API, https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API :
  card-to-viewer transition from Home into a Journey, progressive enhancement only.
- NASA image use guidelines, https://www.nasa.gov/nasa-brand-center/images-and-media/ :
  credit lines and no insignia.
- Fonts: Geist and Geist Mono, https://vercel.com/font and
  https://github.com/vercel/geist-font , SIL Open Font License.
- Zoom insets in scientific figures, for example Matplotlib's inset with connector
  lines, https://matplotlib.org/stable/gallery/subplots_axes_and_figures/zoom_inset_axes.html :
  the model for the loupe and its leader lines, read as an instrument rather than a toy.

All links resolved on 2026-11-17. The references were not re-audited screen by screen.

## 13. Decisions

Decided on 2026-11-17:

1. "Journeys" is the organizing concept: story first, then free exploration.
2. Dark-first, with an always-dark viewer canvas and a light theme for the chrome.
3. Visual direction C "Instrument" is chosen, pending final mockup approval: Geist and
   Geist Mono, hairline rulers in image pixels, bracket stop markers, a route line, and
   readouts limited to computed values (6.3).
4. The loupe from direction D joins C, drawn in C's language (6.5).
5. Andromeda launches first, and the viewer serves images of any shape: the
   aspect-ratio rule (6.4) governs the overview, markers and thumbnails.
6. English only at launch; strings are kept in one place so pt-BR can follow.

Superseded on 2026-11-17: Instrument Serif for titles, Inter for the interface and
JetBrains Mono for numbers, decided earlier the same day, are replaced by Geist and
Geist Mono with direction C.

Still open (tracked in `docs/roadmap.md`): final approval of the C mockups, which
Journeys launch after Andromeda and whether launch waits for Light. Kiosk scope is
proposed in 14.3, awaiting the maintainers' approval.

## 14. Feature labels and kiosk: acceptance

Specified on 2026-11-17 for roadmap F-03 and F-01, in direction C. Every rule below is
written to become an end-to-end geometry assertion. Unless a rule says otherwise it holds
at 390x844 and 1440x900, in the dark and the light theme, which makes four cells per rule.
"Box" means `boundingBox()` in CSS pixels; "intersects" means the two boxes overlap by more
than 1px on both axes. Tolerances are 1px.

### 14.1 Standing rules (every cell, every state below)

- **S1, gutter.** On Home, the left edges of the header content, every section and the
  footer content are equal, and equal `--gutter` (16, 40 or 64px by width). In the viewer,
  every new overlay in this section (label popover, kiosk chip, idle countdown) keeps at
  least `--edge` (12px) plus the safe-area inset from each viewport edge.
- **S2, credit visible.** The image credit (`sheetCredit` in the viewer, the footer credit on
  Home) has a box fully inside the viewport and intersects no label marker, label chip,
  popover, kiosk chip or countdown.
- **S3, nothing covers controls.** No element added here intersects the top bar groups, the
  view controls group, the overview card, the readout, the compare or light bar, or the
  sheet's handle row. Every offset is computed from those elements' measured edges, never
  from a constant.
- **S4, focus ring.** Every control added here shows a 2px `--accent` outline with a 2px
  offset on `:focus-visible`. At each of the ring's four corners, `elementFromPoint`
  returns the focused control or a descendant, so no overlay or tile paints over it.

### 14.2 F-03, feature labels

**Data.** One labels file per image, each entry `{ id, text, x, y, r?, description }` in
full-image pixels (origin top-left), converted to normalized u,v as stop markers are (6.4).
The four entries and their text are exactly the validated set of 2026-11-17: Andromeda
core, Satellite galaxy M32, NGC 206 (Andromeda, no radius) and Active region 13664 (Sun,
r 240 in the 4096px SDO frame, shared by every band within 3.5px). No other text ships.

**Where labels exist.** Explore and Light, on images that have a labels file. Never in Story
(the stop markers own the image there) and never in Compare (two images, two frames). An
image without labels shows no toggle at all.

**Toggle.**

- L1. An icon button (Lucide `tag`, 1.125rem in a 2.75rem square) in the view controls
  group, directly above Reset view, at every width. Box 44x44 or larger.
- L2. Default off on every visit. On: `aria-pressed="true"`, `--accent` fill with the icon in
  `--ground` (the fill is the non-color cue: at least 3:1 luminance against the off state),
  and `labels=1` in the URL through the existing debounced `replaceState`. A URL with
  `labels=1` opens with labels on.
- L3. Accessible name "Feature labels". Toggling announces "Feature labels shown" or
  "Feature labels hidden" in the existing live region.
- L4. Leaving Explore or Light hides the labels; returning restores the toggle state.

**Marker and leader.** Drawn in the dark values in both themes (`data-theme="dark"`, as the
stop markers are), so a light-theme assertion reads the same colors as a dark one.

- L5. A point feature is a ring, 0.625rem (10px) outside diameter, 1.5px `--marker` stroke,
  with the 3px `--halo` under-stroke. Round on purpose: stop markers are square brackets,
  so the two never read alike.
- L6. A feature with `r` draws a 1px `--marker` circle dashed 4 3 over the halo, at the
  on-screen radius, when that radius is 12px or more; below 12px it draws the L5 ring.
- L7. Leader: 1px `--marker` at 0.55 alpha over the halo, 1rem long, from the ring's edge
  (or the circle's edge at 45 degrees up and right) to the chip.
- L8. Chip: Geist 500, 0.8125rem, sentence case as written in the data, one line, no
  truncation (the longest text, "Satellite galaxy M32", fits), `--glass` dark with a 1px
  `--hairline`, padding 0.25rem 0.5rem, radius 0.125rem. Chip box height 24px or more;
  the button around it is 44px tall or more (transparent padding), and only that box takes
  pointer input, so pans and pinches elsewhere reach the image.
- L9. Chip text against its own background: 4.5:1 or more (computed colors).

**Placement and collision** (re-run on every viewport change, after the frame paints).

- L10. The free area is the viewer box minus the rulers, minus the top bar's bottom edge,
  minus the top edge of the lowest overlay on each side (controls, overview, readout,
  light bar, sheet), each plus `--edge`.
- L11. A marker whose center is outside the free area is not rendered.
- L12. Chip placement order: right of the marker, left, above, below. The first position
  whose chip box lies inside the free area and intersects no placed chip, marker or
  circle wins. If none fits, the chip is hidden and its marker stays.
- L13. Priority when chips compete: data order (core, M32, NGC 206), so the galaxy's core
  is never the one hidden.
- L14. Assertion at fit and at every Andromeda Journey stop viewport, both widths: no two
  visible chips intersect, no chip intersects any element listed in S3, and every visible
  chip is inside the free area.
- L15. No zoom threshold: at fit on a phone the collision rule alone decides. At 1440x900
  fit all three Andromeda chips are visible; at 390x844 fit the core chip is visible.
- L16. Chips and markers fade in over `--dur-base`; under reduced motion they appear at once.

**Description.**

- L17. Activating a chip (click, tap, Enter or Space) opens a popover: the label text in
  Title type, the description in Body type (42ch max), and a close button (44x44, "Close").
  The chip has `aria-expanded` and `aria-controls`. One popover at a time.
- L18. Desktop (48rem and up): the popover is anchored beside its chip using the L12 order,
  inside the free area, intersecting no chip, marker, circle or S3 element; it never
  covers its own marker.
- L19. Phone (under 48rem): the popover docks with its bottom edge 0.5rem above the sheet's
  measured top edge, spanning from the left `--edge` to the right `--edge`, and the view
  does not move. Its own marker stays visible: if the marker would fall under the popover,
  the image pans so the marker sits 1rem above the popover's top edge.
- L20. Esc, the close button, a tap on the image or a second activation closes it, and
  focus returns to the chip. Hovering opens nothing (no hover-only content, WCAG 1.4.13).
- L21. The popover follows the theme like the other glass panels in the viewer (its
  background equals the computed background of the view controls group).

**Keyboard and text alternative.**

- L22. Visible chips are buttons in the tab order after the view controls, sorted left to
  right, then top to bottom on screen. Hidden chips are not focusable.
- L23. About this image lists "Labeled features" with one row per label (text and
  description). Each row has a "Show" button that turns labels on, flies to the feature
  (centered, zoom so a radius fills a third of the shorter side, else the image's
  existing stop zoom nearest that point) and opens its popover. This is the path to a
  label whose chip is hidden and the text alternative for the overlay.

**As built (Sprint 9).** One labels file may name several images on one pixel grid, so the
seven SDO bands share `data/labels/sun-sdo-2024-05-10.json`. In L10, an overlay across the
width (the phone sheet) sets the foot of the free area, and an overlay at a side (controls,
overview, readout, a bottom Light bar) closes the corner below its top edge, inflated by
`--edge`; markers there are not drawn. On a phone the view controls step aside while a
description is docked (L19 and S3 would otherwise collide). For a feature drawn as a circle,
the right placement hangs off the 45 degree point and left, above and below sit off the
circle's own box, so at 390x844 in Light the Sun region's chip takes the left side.

**Copy.** Toggle name "Feature labels"; live region "Feature labels shown" / "Feature labels
hidden"; About heading "Labeled features"; row action "Show". Label and description text
come only from the validated data.

### 14.3 F-01, kiosk mode

**Entering and leaving.**

- K1. `?kiosk=1` on any route turns kiosk on and stores it in `sessionStorage`, so in-app
  navigation and reloads keep it. `?kiosk=0` turns it off. No control in the interface
  leaves kiosk mode.
- K2. Kiosk forces the dark theme: with a stored light preference, the computed
  `--ground` is still `#07090D`. The theme switcher is not rendered.

**No links out.**

- K3. The DOM has no `a[href]` whose origin differs from the page's, no `target="_blank"`
  and no `mailto:`/`tel:` link. Credits, sources and the NASA links render as plain text.
- K4. Share and Fullscreen are not rendered (a kiosk runs full screen already, and a
  copied link has nowhere to go). The `?` shortcut sheet still works for staff (planned:
  the app has no `?` sheet yet).

**Attract loop.**

- K5. With no input, the app plays Story through every published Journey in roadmap order
  (Andromeda, then the Sun), and after the last stop of the last Journey starts again at
  stop 1 of the first.
- K6. Each stop dwells 8 s after its flight settles. The stop card, the credit and the
  current stop marker are visible for the whole dwell (S2 holds on every stop).
- K7. A chip "Touch to explore" sits bottom center, 0.75rem above the highest top edge of
  the bottom overlays it shares columns with (sheet, light bar, controls, overview card,
  readout; an overlay off to a side does not lift it), else 0.75rem above the foot of the
  screen, Label type at
  1.125rem, box 56px tall or more. It pulses opacity 0.7 to 1 over 2 s; under reduced
  motion it does not pulse, and flights become the 200 ms cut.
- K8. Any pointerdown, touchstart, wheel or keydown stops the loop at the current stop,
  hides the chip within `--dur-base` and leaves the visitor in Story with every control.
  That first touch does nothing else (it does not also pan or press a button).

**Large targets.**

- K9. Every interactive element is 56x56px or larger (3.5rem) and has 8px or more between
  its box and any other interactive box. Body text is 1.125rem or more.
- K10. Nothing depends on hover: the Home loupe follows taps, and the 6.5 loupe has no
  hover-only state in kiosk.
- K11. Long press opens no context menu and selects no text on chrome (`contextmenu`
  prevented, `user-select: none` outside the stop body text).

**Idle reset** (testable with Playwright's `page.clock`).

- K12. After 90 s with no input (outside the attract loop), the countdown sheet appears
  with the copy in 5.8: "Still exploring? Returning to the start in 10 s." and the button
  "Keep exploring" (56px or more tall). The seconds count down once per second.
- K13. The countdown sits bottom center, docked as K7 says (0.75rem above the highest
  bottom overlay that shares its columns, else the foot of the screen), within
  the S1 edges, intersects no S3 element, and takes focus on open; Keep exploring or
  any input closes it and restarts the 90 s timer.
- K14. At 0 s it resets: sheets and popovers close, labels off, Compare and Light state
  cleared, the URL back to `/?kiosk=1`, and the attract loop restarts at stop 1 of the
  first Journey. The countdown and its outcome are announced in the live region.

**As built (Sprint 9).** The flag and the forced dark theme are set before the first paint
by `public/theme-init.js`. Home in the loop dwells 8 s, then opens stop 1 of the first
Journey; the reset returns to `/?kiosk=1` the same way. A passing pointer (no press) keeps
the visitor's session alive but never ends the loop. On a phone the zoom buttons step aside while
the countdown is open, as they do for a docked label description. The countdown announces its copy once
when it opens, and "Returning to the start." at the reset; the sheet's own number updates
silently. To meet K9, the overview's route marks and, below 40rem, Home's strip stops are
inert in a kiosk (the stop list, Next and the lens remain); K10 therefore holds on wide
screens only.

**Viewports.** K-rules are asserted at 1440x900 and 390x844 in the dark theme, plus the K2
check with a stored light preference; the screen in a museum is usually 1920x1080, which
is checked once by hand at the gate.

References relied on: WAI-ARIA Authoring Practices disclosure pattern,
https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/ (chip and popover); WCAG 2.2
target size and content on hover or focus,
https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html and
https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html ; the
priority-and-collision labeling of web maps (labels drop by rank rather than overlap) as in
MapLibre's symbol placement, https://maplibre.org/maplibre-style-spec/layers/#symbol .
Not re-fetched for this section.

## 15. Search and detail of the week: acceptance

Specified on 2026-11-17 for roadmap F-04 and F-02, in direction C. Status: planned for
Sprint 10; nothing in this section is built yet. Sky coordinates (RA and Dec) are planned
beyond Sprint 10: they need a validated sky mapping per image (6.3). The conventions of 14
hold: four cells per rule (390x844 and 1440x900, dark and light), boxes from
`boundingBox()` in CSS pixels, 1px tolerance.

### 15.1 Standing rules

S1 to S4 (14.1) hold for every element added here. Three more apply to every rule below:

- **S5, idle fade.** The viewer's Search button carries the same idle class as Share: on a
  fine pointer at 40.0625rem and up its opacity is 0 after the idle delay and 1 again on
  pointer move; on a phone it stays at 1. While the search dialog is open the viewer never
  goes idle.
- **S6, reduced motion.** Every transition named here has a reduced-motion variant: under
  `prefers-reduced-motion: reduce` its computed `transition-duration` is 0s and a camera
  flight is the 200 ms cut of 5.8.
- **S7, CLS 0 on Home.** Cumulative layout shift on Home, measured from navigation until
  1 s after the detail-of-the-week crop has scrolled into view, is 0 at both widths.

### 15.2 F-04, search

**Index.**

- Q1. The index is built at build time from content whose validation status is `approved`
  and whose `mock` is false, and is inlined into the page: opening search or typing makes
  no network request. It holds three kinds: every image title (10), every label text in
  `data/labels` (4) and every Journey stop title (14), 28 entries today. A mock or
  unapproved entry never appears (unit test with a fixture).
- Q2. The serialized index is 8 KB or less in each page's HTML.
- Q3. Each entry links as follows; the parameter order is the one `serializeViewerParams`
  writes.
  - Image: `/<id>/?mode=explore`.
  - Journey stop: `/<journey slug>/?mode=story&stop=N`, N from 1.
  - Label: the image that owns it, labels on, centered on the feature. Light when the
    labels file belongs to a band set (its first image's page), else Explore. Zoom: with
    `r`, z = min(W, H) / (3r) to two decimals, so the radius fills a third of the shorter
    side as in L23; without `r`, the zoom of the stop on that image whose target
    (`stopTarget`) is nearest the feature. Today's four:
    `/andromeda-phat-phast-2025/?mode=explore&labels=1&x=17461&y=6482&z=6`,
    `…&x=11412&y=2448&z=12`, `…&x=5330&y=7260&z=15` and
    `/sun-sdo-2024-05-10-aia-94/?mode=light&labels=1&x=3020&y=2508&z=5.69`.

**Entry points.**

- Q4. Home header: a Search button first in the nav group, Lucide `search` at 1.125rem.
  From 48rem up it shows the text "Search" and a `/` keycap (keycap `aria-hidden`); below
  48rem it is icon only, 44x44 or larger, accessible name "Search". It has
  `aria-keyshortcuts="/"` at every width.
- Q5. Viewer: an icon button named "Search" in the top bar's right group, directly before
  Share, 44x44 or larger, in every mode. At 390x844 no two top bar groups intersect and
  none wraps to a second line (S3).
- Q6. Pressing `/` on Home or in the viewer opens search, whatever Shift state the layout
  needs to type it, unless focus is in a text field or a dialog is already open. The `/` is
  not typed into the input. Ctrl, Cmd and Alt combinations pass through.

**Dialog.**

- Q7. A modal `<dialog>` opened with `showModal()`, accessible name "Search": everything
  outside it is inert while it is open, so S3 is checked with it closed. Its `::backdrop`
  is transparent (computed `rgba(0, 0, 0, 0)`): the image stays visible and nothing is
  dimmed.
- Q8. From 48rem up: the panel is `min(40rem, 100vw - 2 * --gutter)` wide, horizontally
  centered, top edge 6rem below the viewport top, and it intersects no top bar group.
  Below 48rem: it spans from the left `--edge` to the right `--edge`, top edge at `--edge`
  plus the safe-area inset.
- Q9. In both cases the panel's bottom edge stays 0.5rem or more above the top edge of the
  visible image credit, so S2 holds with the dialog open; past that height the result list
  scrolls inside the panel.
- Q10. Glass panel as L21 (background equal to the view controls group's in the viewer,
  `--glass` on Home), 1px `--hairline`, radius `--radius-panel`. It opens with opacity 0 to
  1 and a 0.5rem rise over `--dur-panel` `--ease-standard`, and closes over `--dur-base`
  `--ease-exit` (S6).
- Q11. Input: one line, Geist 1rem or larger (so iOS does not zoom), `maxlength` 80,
  `autocomplete="off"`, `spellcheck="false"`, `autocapitalize="off"`,
  `enterkeyhint="go"`. It takes focus on open. A visible Close button (44x44, "Close")
  sits at the input's right end.
- Q12. Esc, Close or a press outside the panel closes it, and focus returns to the element
  that had it before (the Search button, or the element where `/` was pressed). In the
  viewer, Esc with the dialog open closes only the dialog: it does not exit fullscreen or
  close a sheet or popover.
- Q13. From 48rem up on a fine pointer, a hint row under the list reads "↑ ↓ Move",
  "Enter Open", "Esc Close" in Label type with Geist Mono keycaps. It is not rendered on a
  phone.

**Matching.**

- Q14. Normalization of query and entry text: Unicode NFKD, combining marks removed,
  lowercase, split on every character outside `a-z` and `0-9`. "Å" becomes "a", so
  "171 a" finds "171 Å, the same view".
- Q15. An entry matches when every query word is a prefix of some word of its text. Rank,
  in order: tier (0 the normalized words equal the query's, 1 the text's first words are the
  query's with the last one as a prefix, 2 any other match), then entries on the current page's image first (viewer only), then kind
  (label, stop, image), then data order (Journeys in roadmap order and stops in order,
  labels in file order, images by id). At most 8 rows show.
- Q16. Test vectors on Home: "m32" gives Satellite galaxy M32, then The companion galaxy
  M32. "andromeda" gives Andromeda core, then Andromeda Galaxy (M31), Hubble PHAT+PHAST
  panorama, then The Andromeda Galaxy. "171" gives 171 Å, the same view, then The Sun,
  SDO AIA 171 Å, 2024-05-10 12:00 UTC. "your turn" gives two Your turn rows, Andromeda's
  first. "sun" gives One Sun, seven bands, then the seven SDO images, 8 rows and no overflow
  line. "the" matches 14 entries: The Andromeda Galaxy, The bright center, The companion
  galaxy M32, then five SDO images, with "Showing 8 of 14. Type more to narrow." under
  them (the line shows only past 8). "pillars" gives the 1995 image, then 2014.
- Q17. Results update on every input event with no debounce and no animation. The live
  region (`role="status"` inside the dialog) says "1 result", "{n} results" or "No
  results", debounced to 500 ms.

**Rows.**

- Q18. The list follows the WAI-ARIA combobox pattern with a listbox popup: the input has
  `role="combobox"`, `aria-expanded`, `aria-controls` and `aria-activedescendant`; each row
  is a `role="option"`. The first row is active by default. Up and Down move the active
  row and stop at the ends; Enter opens it; a click or tap on a row opens it. Every row is
  44px tall or more.
- Q19. A row shows a kind glyph drawn in the instrument language (label: the L5 ring;
  stop: a bracket; image: a frame; point: a crosshair), the name in Body type with the
  matched word prefixes at weight 600 (weight, not color, marks the match), a context line
  in `--text-muted`, and a kind tag in Label type: "Feature", "Stop", "Image" or "Point".
  Context: a label shows its image's title (the band set's title for a band set); a stop
  shows "{Journey title} · Stop {n} of {m}" (`stopOf`); an image shows none.
- Q20. The active row has a 2px `--accent` bar at its left edge and the `--hairline`
  background; `aria-selected="true"` is on it alone. Name and context text against the
  panel: 4.5:1 or more (computed colors).
- Q21. Opening a row closes the dialog. A row for the page already open moves the view in
  place (fly to x, y, z with labels on, or go to stop N) and updates the URL through the
  existing `replaceState`, with no document reload; any other row navigates client side.
  After either, the URL equals the row's href (Q3).

**Coordinates.**

- Q22. A query is a point when it is two numbers separated by a comma, spaces or both:
  `^\s*-?\d+(\.\d+)?\s*(,\s*|\s+)-?\d+(\.\d+)?\s*$`. Decimals round to integers. "17461,
  6482", "17461 6482" and " 17461 ,6482 " are the same point. A point query still runs name
  matching (Q15); point rows sit after the name rows under the group label "Go to a point".
- Q23. In the viewer a point is in the current image's pixels (the reference image's in
  Compare, the shared grid in Light). When 0 ≤ x < W and 0 ≤ y < H one row "Go to {x}, {y}",
  context "In this image", opens it: Story switches to Explore, other modes stay; z is the
  current zoom when it is 4 or more, else 4, capped at `maxZoom`. After the flight the
  readout shows Center x and Center y equal to the point (for a point at least half a view
  from every edge) and the URL carries the same x, y and z.
- Q24. On Home a point gives one row per image that contains it, "Go to {x}, {y}" with the
  image title as context, to `/<id>/?mode=explore&x=&y=&z=4`. The images of one band set
  are one row, to its first image in Light (`?mode=light&x=&y=&z=4`) with the band set's
  title as context. Order: Journey images in roadmap order, then the rest by id. "2048,
  2048" gives Andromeda, the Sun band set, then Pillars of Creation, Hubble 2014 (the 1995
  frame is 1518 by 1497).
- Q25. Sky coordinates are detected, not converted: a query with a digit followed by `h`,
  `m`, `s`, `°`, `′`, `″`, `'` or `"`, or with the word `ra` or `dec`, shows the sky note
  (copy below) and no point row. Converting RA and Dec to pixels is planned.

**States** (each a non-selectable status line in the panel, `--text-2`, Body type).

| State | When | Copy |
|---|---|---|
| Empty query | input empty | hint line, then the "Labeled features" group listing every label as a row (all images on Home, the current image's first in the viewer) |
| No match | no name row and no point row | "No matches for “{query}”." then the hint line |
| Point outside, viewer | Q22 matches, outside the image | "No pixel at {x}, {y} in this image. Points run from 0, 0 to {W − 1}, {H − 1}." |
| Point outside, Home | Q22 matches, no image contains it | "No image has a pixel at {x}, {y}." |
| Sky coordinates | Q25 | "Sky coordinates (RA and Dec) are not supported yet. Type image pixels instead, like {example}." |
| Empty index | Q1 finds nothing | "Nothing to search yet." |

`{example}` is the center of the current image, floor(W / 2), floor(H / 2), or of the
Home hero image on Home: "21104, 4935" for Andromeda. Numbers in these strings are
written as the user types them, without digit grouping. The hint line is "Search image
titles, feature labels and Journey stop titles. To go to a point, type its image pixels,
like {example}." A point state line replaces the point rows only; name rows above it
still show.

- Q26. Kiosk (14.3): the Search button, Close and every row are 56x56px or larger and K9's
  8px spacing holds; Q13 is not rendered; the reset of K14 closes the dialog. Results are
  same-origin, so K3 holds.

### 15.3 F-02, detail of the week

**Pool and pick.**

- W1. The pool is `data/weekly.json`, an ordered list of references to items that already
  exist and are validated: `{ "kind": "stop", "journey": slug, "stop": id }` or
  `{ "kind": "label", "labels": file id, "label": id }`. The content validator fails the
  build, naming the entry, when a reference does not resolve or resolves to an unapproved
  or mock item. A missing file or an empty list renders no card and fails nothing.
- W2. Only stops with a single place (`aimableStops`) and stops whose text stands on its
  own may be listed: Sun stops 2, 3 and 6 refer to their neighbors ("The next three
  stops", "the 171 Å band that follows", "switch to HMI") and stay out. A label that
  repeats a stop at the same place stays out too. The proposed pool, in order:
  1. Andromeda, The bright center (stop 2)
  2. Label Active region 13664 (Sun)
  3. Andromeda, Dust lanes (stop 3)
  4. Sun, 171 Å, the same view (stop 4)
  5. Andromeda, The companion galaxy M32 (stop 4)
  6. Sun, 211 Å, the same view (stop 5)
  7. Andromeda, NGC 206 (stop 5)
  8. Andromeda, Toward single stars (stop 6)

  Showing an item outside its Journey is a new context for validated text, so this list
  goes through the science gate before it ships.
- W3. The build date is `SOLARIA_BUILD_DATE` (YYYY-MM-DD) when set, else the build
  machine's date in UTC. The card shows pool item (isoWeek - 1) mod n, n the pool length.
  Vectors with the pool above: 2026-11-17 (week 47) NGC 206; 2026-11-23 (week 48) Toward
  single stars; 2026-12-07 (week 50) Active region 13664; 2026-12-28 and 2027-01-03 (week
  53) The companion galaxy M32; 2027-01-04 (week 1) The bright center.
- W4. The card changes only when the site is rebuilt. A weekly scheduled rebuild is
  planned and waits on the host decision (L-03, L-04).

**Placement and layout.**

- W5. On Home the card is its own section, `<section aria-labelledby>` with the h2 "Detail
  of the week", directly after the Journeys index and before Reading the instrument. Its
  left edge equals `--gutter` (S1).
- W6. From 48rem up: two columns, the crop at 21.25rem square (the loupe's size, 6.5) on
  the left, the text column on the right, 2.5rem gap, the text at 42ch or less. Below
  48rem: one column, heading, crop at the full content width (358px at 390) and square,
  then the text. The crop box has `aspect-ratio: 1` before any tile loads (S7).
- W7. Text column, in order: the eyebrow "Week {n}" (Label type, Geist Mono, `--text-muted`,
  n the ISO week of W3), the item's title in Title type (stop title or label text), the
  context line, the item's validated text in Body type (a stop's `body`, every paragraph;
  a label's `description`), and the action. No other text: nothing is truncated, rewritten
  or added (science gate).
- W8. Context line: a stop shows "{Journey title} · Stop {n} of {m}"; a label shows
  "Feature label · {image title}", the band set's title for a band set.

**Crop.**

- W9. The crop is drawn from the same tile pyramid as the viewer (6.5) with the lens's
  tile placement (`lensTiles`), chosen at build time for 720 device pixels across, so the
  HTML is identical for every visitor. A stop uses its `lensField` on its band's image
  (`band`, else the Journey image); a label uses a field 3r across centered on it (r from
  the data, else the side of the nearest stop's field). At most 16 tiles, each `<img>`
  with `loading="lazy"`, `decoding="async"`, and its width and height set.
- W10. The canvas inside the crop stays dark in both themes, like the viewer. Rulers on
  its top and left edges label image pixels (6.5). A stop draws the amber bracket frame
  0.375rem outside the crop's corners; a label draws its L5 ring or L6 circle at the
  crop's center, in the dark marker values, its radius a third of the crop side for a
  label with `r`.
- W11. Under the crop, a readout of computed values only (6.3): "Zoom" (one decimal, "15.0×"),
  "Center x" and "Center y" with the readout's digit grouping. Under the readout, the
  image's credit line from its source, in Label type, fully visible with no truncation.
- W12. The crop's `alt` is "{title}, a detail of {image title}". Tiles that fail to load
  leave the dark canvas, never a broken-image icon (5.8 tile errors).

**Action.**

- W13. One link, visible text "Go to this detail", `aria-describedby` pointing at the
  title, to the item's href (Q3: `/<slug>/?mode=story&stop=N` for a stop, the label link
  for a label). Week 47 links to `/andromeda/?mode=story&stop=5`. The card itself is not a
  link and the crop is not focusable.
- W14. The link is a 44px tall target or more (56px in a kiosk, K9) with the S4 ring.
  Hover underlines it over `--dur-fast`; nothing else depends on hover (K10).

### 15.4 Copy

Every new string, in one place so pt-BR can follow (13.6):

- Search button and dialog: "Search"; input label (visually hidden): "Search Solaria";
  placeholder: "Feature, stop, image, or x, y"; "Close".
- Group labels: "Labeled features", "Results", "Go to a point".
- Kind tags: "Feature", "Stop", "Image", "Point".
- Point row: "Go to {x}, {y}"; its viewer context: "In this image".
- Hint line: "Search image titles, feature labels and Journey stop titles. To go to a
  point, type its image pixels, like {example}."
- Overflow: "Showing 8 of {n}. Type more to narrow."
- Keyboard hint: "↑ ↓ Move", "Enter Open", "Esc Close".
- Live region: "1 result", "{n} results", "No results".
- States: "No matches for “{query}”."; "No pixel at {x}, {y} in this image. Points run
  from 0, 0 to {W − 1}, {H − 1}."; "No image has a pixel at {x}, {y}."; "Sky coordinates
  (RA and Dec) are not supported yet. Type image pixels instead, like {example}.";
  "Nothing to search yet."
- Detail of the week: heading "Detail of the week"; eyebrow "Week {n}"; label context
  "Feature label · {image title}"; action "Go to this detail"; crop alt "{title}, a detail
  of {image title}".

Reused, not new: "Stop {n} of {m}", "Zoom", "Center x", "Center y", titles, label texts,
descriptions, stop bodies and credits, all from validated data.

References relied on: WAI-ARIA Authoring Practices combobox pattern,
https://www.w3.org/WAI/ARIA/apg/patterns/combobox/ (Q18); the modal dialog pattern,
https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ , and the HTML `<dialog>`
element's `showModal()`, https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog
(Q7, Q12); Nielsen Norman Group on search results pages and zero-results pages,
https://www.nngroup.com/articles/search-no-results-serp/ (the no-match state keeps a way
forward); web.dev on CLS, https://web.dev/articles/cls (S7, W6). The `/` shortcut follows
the convention of GitHub and MDN's site search. Not re-fetched for this section.
