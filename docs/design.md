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
  make room, and on pages that offer Compare once its switch is there. The camera frames the stop in the top 60 %; near an image edge the view
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
Journeys launch after Andromeda, whether launch waits for Light, and kiosk scope.
