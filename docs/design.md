# Solaria relaunch: experience and visual direction

Status: direction approved on 2026-11-17 (Journeys, dark-first, serif titles, English only).
Nothing here is built yet; a mockup is approved before the first build step.
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

**J2, first visit (laptop).** Home opens on a slow live drift across a deep-zoom image
with one line of copy and one button, "Begin the journey". Below the fold, the other
Journeys as large image cards. Picks Andromeda, scrolls through the story, presses E to
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
/                      Home: live hero + Journey cards
/[journey]             Journey viewer (mode via ?mode=story|explore|compare|light)
                       viewport via ?x=&y=&z=  (image coordinates, 0..1 width units)
/about                 What Solaria is, credits, data sources, accessibility statement
```

No separate "tools" pages. Removing them is the main structural change.

## 5. Page-by-page

### 5.1 Home, desktop (1440 wide)

```
+--------------------------------------------------------------------------------+
| SOLARIA                                              Journeys   About   [moon] |  transparent bar over image
|                                                                                |
|                                                                                |
|        (full-bleed deep-zoom image, slow drift, 0.5 % scale per second)        |
|                                                                                |
|   Some pictures are too big                                                    |  display serif, 4rem
|   to see at once.                                                              |
|   Andromeda, as Hubble saw it: 2.5 billion pixels. Zoom until you find a star. |  body, 1.125rem, max 36ch
|   [ Begin the journey  -> ]   or explore freely                                |  primary + text link
|                                                                                |
|                                                    credit line, 0.75rem   [||] |  pause drift control
+--------------------------------------------------------------------------------+
|  More journeys                                                                 |
|  +------------------------+ +------------------------+ +------------------------+
|  | [image crop, 4:5]      | | [image crop]           | | [image crop]           |
|  |                        | |                        | |                        |
|  | ANDROMEDA  Hubble      | | THE SUN IN 7 COLORS    | | MARS DUST STORM        |
|  | 6 stops, 4 min         | | Light mode             | | Compare 2 dates        |
|  +------------------------+ +------------------------+ +------------------------+
|  footer: About, Sources and credits, Accessibility                              |
+--------------------------------------------------------------------------------+
```

Journey names and numbers above are placeholders until product picks them and the science
team validates them (the 2.5 billion figure included).

Cards are image-first, no borders: the crop fills the card, title and meta sit on a
bottom scrim. Hover: crop scales 1.03 over 320 ms; focus: 2px accent ring.

### 5.2 Home, phone (390 wide)

```
+---------------------------+
| SOLARIA              [=]  |
|                           |
|   (live image, drifting)  |
|                           |
| Some pictures are         |
| too big to see at once.   |  2.5rem
| 2.5 billion pixels...     |
| [ Begin the journey -> ]  |  full width, 3rem tall
+---------------------------+
| More journeys             |
| [card, full width, 4:3]   |
| [card]                    |
+---------------------------+
```

### 5.3 Journey, Story mode, desktop

```
+--------------------------------------------------------------------------------+
| <- SOLARIA   Andromeda Galaxy           Story  Explore  Compare  Light    [^] |  mode switcher = segmented, glass
|                                                                                |
|  +---------------------------+                                                 |
|  | 3 / 6                     |          (camera flown to stop 3,               |
|  | A cluster of young stars  |           area of interest kept in the          |
|  |                           |           right 2/3 of the frame)               |
|  | The blue knot here is ... |                                                 |
|  | 80 words max              |                  ( ring marker on the feature ) |
|  |                           |                                                 |
|  | [<-]  o o * o o o  [->]   |                                                 |
|  +---------------------------+                                                 |
|                                                          +-------+             |
|  Hubble, NASA, ESA ... (credit)            scale bar     |minimap|  [-][+][[]] |
+--------------------------------------------------------------------------------+
```

- Caption card: left column, 22rem wide, vertically centered. The camera target for each
  stop is offset so the feature sits in the visible area right of the card (pass the
  card's width to the viewer as padding when computing the fit).
- Progress dots are buttons (stop names in their accessible labels).
- Scroll wheel advances stops only while the pointer is over the card; over the image,
  the wheel zooms. This avoids the classic scrollytelling conflict where scroll both
  moves the story and zooms the map.
- Marker: a 2px ring with a dark outer halo, white, pulsing once on arrival (none under
  reduced motion). Never filled, so it never hides the feature.

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

### 5.5 Journey, Explore mode

```
+--------------------------------------------------------------------------------+
| <- SOLARIA   Andromeda Galaxy           Story  [Explore]  Compare  Light  [^] |
|                                                                                |
|                       (image, nothing over the center)                         |
|                                                                                |
|                                                                                |
|  [i] About this image                                     +-------+            |
|  x 0.4213  y 0.1170   zoom 38x   (mono)                    |minimap| [-][+][[]] |
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
|  |  6173 A   |    171 A      |     94 A                                     |  |
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
| Reduced motion | camera cuts with a 200 ms crossfade, no home drift, no pulse | none |
| Kiosk idle | countdown sheet | "Still exploring? Returning to the start in 10 s. [Keep exploring]" |

## 6. Visual language

**Dark-first, with a real light theme.** Space images sit on black; a light frame around
them lowers perceived contrast and makes the image look washed out. The viewer canvas is
always near-black in both themes (like a photo editor), and only the chrome, cards and
the About page switch. The light theme follows the system setting and the toggle.

**One accent, for action only.** A warm solar amber marks buttons, focus and selection.
It is never used on data or markers, so it never competes with the image's own colors
(lesson kept from earlier work: one hue cannot mean both "action" and "data").

**Editorial type.** A serif display face for Journey titles and stop headings gives the
storytelling register of a science magazine; a neutral grotesque runs the interface; a
monospace with tabular figures shows coordinates and zoom so numbers do not jitter.

### 6.1 Tokens (draft)

Contrast ratios computed against WCAG 2.x relative luminance; perceived contrast on the
amber still to be judged on the mockup.

```css
:root {                                   /* dark, default */
  --ground:        #07090D;               /* page and viewer canvas */
  --surface:       #141821;               /* solid panels, cards meta */
  --glass:         rgb(12 15 22 / 0.72);  /* overlays on the image; backdrop-filter: blur(1rem) saturate(1.2) */
  --hairline:      rgb(255 255 255 / 0.08);
  --text:          #E9ECF2;               /* 16.8:1 on ground */
  --text-muted:    #9BA3B4;               /* 7.9:1 on ground, 7.0:1 on surface */
  --accent:        #FFB547;               /* 11.3:1 on ground; text on accent uses --ground */
  --accent-press:  #E89A22;
  --marker:        #FFFFFF;               /* rings, with 0 0 0 2px rgb(0 0 0 / 0.6) halo */
  --danger:        #FF7A6B;
  --viewer-canvas: #07090D;               /* same in both themes */
  color-scheme: dark;
}
[data-theme="light"] {
  --ground:        #F7F6F2;
  --surface:       #FFFFFF;
  --glass:         rgb(247 246 242 / 0.82);
  --hairline:      rgb(17 20 26 / 0.10);
  --text:          #11141A;               /* 17.1:1 */
  --text-muted:    #5A6272;               /* 5.7:1 */
  --accent:        #8F5200;               /* 5.8:1 on ground; white on it 6.2:1 */
  --accent-press:  #6F3F00;
  color-scheme: light;
}
```

Data overlays, if any are added later (density heatmaps, altimetry): viridis or cividis
only, always with a labeled legend; never the accent, never a rainbow.

**Type** (self-hosted with `next/font`, no runtime font requests):

| Role | Face | Size / line height | Use |
|---|---|---|---|
| Display XL | Instrument Serif | 4rem / 1.05 (phone 2.5rem) | home headline |
| Display | Instrument Serif | 2.25rem / 1.1 (phone 1.75rem) | Journey title |
| Title | Inter 600 | 1.25rem / 1.3 | stop heading on card, sheet titles |
| Body | Inter 400 | 1.0625rem / 1.55, max 60ch (cards 36ch) | captions |
| Label | Inter 500, +0.04em, uppercase | 0.75rem / 1.2 | mode switcher, card meta |
| Numeric | JetBrains Mono, tabular | 0.8125rem | coordinates, zoom, band wavelengths |

**Spacing**: 0.25rem steps: 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6rem. Viewer overlays sit
1rem from the edges (1.5rem from 64rem up) plus the safe-area insets.

**Radius**: 0.5rem controls, 0.75rem panels and cards, 999px pills and the divider handle.

**Elevation**: no drop shadows on the dark theme; panels separate by glass plus hairline.
Light theme: `0 0.25rem 1.5rem rgb(17 20 26 / 0.10)` on floating panels only.

**Motion**

| Token | Value | Use |
|---|---|---|
| `--dur-fast` | 120 ms | hover, press |
| `--dur-base` | 200 ms | toggles, fades, focus ring |
| `--dur-panel` | 320 ms | sheets, cards entering |
| `--dur-flight` | 1200 to 1800 ms, scaled by zoom distance | camera flights between stops |
| `--ease-standard` | cubic-bezier(0.2, 0, 0, 1) | everything UI |
| `--ease-exit` | cubic-bezier(0.3, 0, 1, 1) | elements leaving |

Camera flights zoom out, pan, zoom in when the stops are far apart (a "fly-over"), so
the user keeps their place; close stops pan directly. Under `prefers-reduced-motion`
every flight becomes a 200 ms crossfade cut and nothing drifts or pulses.

**Iconography**: one outline icon set, 1.25rem in 2.75rem hit areas. Replace the current
mixed `react-icons` sets with Lucide or keep one react-icons family; decide on bundle size.

**Brand**: wordmark "SOLARIA" in Inter 600 with wide tracking; no NASA insignia or
NASA-like marks anywhere (NASA's brand guidelines restrict them). Credits are text.

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
- A visually hidden live region announces the stop title on arrival and "Zoom 38x"
  after zoom settles (debounced 500 ms), never on every frame.
- URL updates with `history.replaceState`, debounced 400 ms after the viewport settles.
- Minimap: hidden on phone, toggle on desktop, click to jump.
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
  them for pointer users; keyboard moves stop to stop. `aria-valuetext`: "171 angstroms, extreme
  ultraviolet". Wavelength units as the source states them.

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
- CLS 0: the viewer reserves the full viewport from the first paint.
- INP under 200 ms: no React state update per viewport frame (the current `setScale` on
  every `viewport-change` re-renders the component during pans); update readouts through
  a ref or throttle to one per animation frame.
- Load OpenSeadragon only on routes with a viewer (dynamic import).

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
2. **Viewer as page**: `/[journey]` with full-bleed Explore mode, overlay controls, URL
   viewport state, keyboard and live region, loading and error states. Home links to it.
3. **Story**: stops JSON, caption card and bottom sheet, camera flights, reduced motion.
   One Journey (Andromeda) with validated text.
4. **Home**: live hero with poster, Journey cards.
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
- Fonts: Instrument Serif, Inter (https://rsms.me/inter/), JetBrains Mono, all open licenses.

All links resolved on 2026-11-17. The references were not re-audited screen by screen.

## 13. Decisions

Decided on 2026-11-17:

1. "Journeys" is the organizing concept: story first, then free exploration.
2. Dark-first, with an always-dark viewer canvas and a light theme for the chrome.
3. Instrument Serif for titles, Inter for the interface, JetBrains Mono for numbers.
4. English only at launch; strings are kept in one place so pt-BR can follow.

Still open (tracked in `docs/roadmap.md`): which Journeys launch after Andromeda,
whether launch waits for Light, and kiosk scope.
