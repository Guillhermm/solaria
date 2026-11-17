import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getContent } from "@/content/load";
import { formatInt } from "@/viewer/view";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "About | Solaria" };

const REPO = "https://github.com/Guillhermm/nasa-2025-solaria";
const TEAM = "https://www.spaceappschallenge.org/2025/find-a-team/solaria4/";

const External = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">
    {children}
    <span className={styles.hidden}> (opens in a new tab)</span>
  </a>
);

// Every credit field is copied from data/sources at build time and shown as the record has it.
const credits = () => {
  const { images, sources } = getContent();
  return sources.map((source) => ({ source, images: images.filter((i) => i.sourceId === source.id) }));
};

const andromeda = () => getContent().sources.find((s) => s.id === "andromeda-phat-phast-2025");

const About = () => {
  const m31 = andromeda();
  return (
    <article className={styles.page}>
      <h1 className={styles.title}>About Solaria</h1>

      <section aria-labelledby="what">
        <h2 id="what">What Solaria is</h2>
        <p>
          Solaria lets you explore very large space images the way you would explore a map. You can follow a guided
          journey, or leave it and zoom anywhere.
        </p>
        <p>
          Each journey is one image and a short path of stops. A stop moves the view to a place and says what is there.
          Touch the image and the story pauses; a button takes you back to it. Every view has its own link, so you can
          share the exact spot you are looking at.
        </p>
        <p>The first journey is the Andromeda Galaxy, from a Hubble panorama.</p>
      </section>

      <section aria-labelledby="team">
        <h2 id="team">Who made it</h2>
        <p>
          Solaria was made by Kauê Melo and Guilherme Almeida Zeni. It began as their entry in the NASA Space Apps
          Challenge 2025, in the challenge &ldquo;Embiggen Your Eyes!&rdquo;, and they kept working on it after the event.
        </p>
        <p>
          Solaria is an independent project. It is not endorsed by NASA or ESA. The images belong to their credited
          owners and are used under the terms listed below.
        </p>
      </section>

      <section aria-labelledby="images">
        <h2 id="images">How images are prepared</h2>
        <p>
          Giant images are cut into small square tiles at several zoom levels, so your device loads only the part you are
          looking at, at the sharpness you need. That is why a very large picture opens quickly and keeps sharpening as
          you zoom.
        </p>
        {m31 && (
          <p>
            The Andromeda panorama in Solaria is a quarter-resolution rendition. It is {formatInt(m31.file.width)} by{" "}
            {formatInt(m31.file.height)} pixels, about {Math.round((m31.file.width * m31.file.height) / 1e6)} million
            pixels. The original has at least 2.5 billion pixels, so you are not seeing it at full resolution.
          </p>
        )}
        <p>
          Nothing is shown before it is checked. Each image, caption and credit is compared with its source, and the
          production build refuses to publish any that has not been approved. Each image page lists what was checked and
          the caveats that apply.
        </p>
        <p>
          Colors can mislead, so Solaria says how they were made. In the Andromeda panorama, colors are assigned to two
          filters, so this is not natural color.
        </p>
      </section>

      <section id="credits" aria-labelledby="credits-title">
        <h2 id="credits-title">Credits and terms</h2>
        <p>Credit lines are copied as the source page prints them.</p>
        {credits().map(({ source, images }) => (
          <div key={source.id} className={styles.credit}>
            <h3>{images[0]?.title ?? source.title}</h3>
            <dl>
              <div>
                <dt>Title</dt>
                <dd>{source.title}</dd>
              </div>
              <div>
                <dt>Credit</dt>
                <dd>{source.credit}</dd>
              </div>
              <div>
                <dt>Release</dt>
                <dd>
                  {source.releaseId ? `${source.releaseId}, ` : ""}
                  {source.releasedAt}
                </dd>
              </div>
              <div>
                <dt>Source page</dt>
                <dd>
                  <External href={source.pageUrl}>{source.pageUrl}</External>
                </dd>
              </div>
              <div>
                <dt>Terms</dt>
                <dd>
                  <External href={source.terms.url}>{source.terms.name}</External>
                </dd>
              </div>
              <div>
                <dt>Retrieved</dt>
                <dd>{source.retrievedAt}</dd>
              </div>
            </dl>
          </div>
        ))}
      </section>

      <section id="accessibility" aria-labelledby="accessibility-title">
        <h2 id="accessibility-title">Accessibility</h2>
        <p>
          Solaria aims to meet WCAG 2.2 level AA. This statement lists only what is built and tested today. Items not
          built are not claimed.
        </p>
        <h3>Keyboard</h3>
        <ul>
          <li>
            In the viewer, + and - zoom, the arrow keys pan (Shift pans further), 0 or Home fits the image, and F toggles
            full screen.
          </li>
          <li>In Story mode, J and K, or Page Down, move between stops. The stops can also be reached with buttons.</li>
          <li>
            On the home page, Tab reaches the stops on the panorama, the Left and Right arrow keys move between them and
            aim the lens, and Enter opens the journey at that stop.
          </li>
          <li>Zoom changes are announced to screen readers once the view settles.</li>
          <li>Mode buttons report which mode is on.</li>
        </ul>
        <h3>Reduced motion</h3>
        <ul>
          <li>If your system asks for reduced motion, the camera cuts to each stop instead of flying to it.</li>
          <li>On the home page, the lens then changes to a new stop without fading.</li>
        </ul>
        <h3>Contrast</h3>
        <ul>
          <li>
            Text and key interface colors in both the dark and the light theme are checked against WCAG 2.2 AA ratios
            (4.5:1 for text, 3:1 for markers and focus) by an automated test.
          </li>
          <li>Solaria follows your system&rsquo;s light or dark setting, and a switch lets you change it.</li>
        </ul>
        <h3>Known gaps</h3>
        <ul>
          <li>
            The panorama itself is an image. The Journey text gives the same content in words, but a screen reader cannot
            read the picture.
          </li>
          <li>
            The home and About pages are checked with axe-core at phone and desktop width, in both themes, by an
            automated test. The viewer pages are not yet checked this way, and an audit with screen readers is planned,
            not yet done.
          </li>
        </ul>
        <p>Tell us if something does not work for you: use the issue link below.</p>
      </section>

      <section aria-labelledby="contact">
        <h2 id="contact">Contact and source code</h2>
        <p>
          Solaria is open source: <External href={REPO}>{REPO}</External>
        </p>
        <p>
          To report a problem or ask a question, <External href={`${REPO}/issues`}>open an issue there</External>.
        </p>
        <p>
          The team page for the Space Apps entry: <External href={TEAM}>{TEAM}</External>
        </p>
      </section>
    </article>
  );
};

export default About;
