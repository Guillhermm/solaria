"use client";

import { useRouter } from "next/navigation";
import { type KeyboardEvent, type MouseEvent, useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { LuSearch, LuX } from "react-icons/lu";
import { useKiosk } from "@/kiosk/useKiosk";
import type { SearchIndex } from "@/search/build";
import { type Here, type RowKind, search } from "@/search/match";
import { bracketPath } from "@/viewer/route";
import styles from "./Search.module.css";

interface SearchProps {
  index: SearchIndex;
  variant: "header" | "viewer";
  buttonClassName?: string;
  here?: Here; // the viewer's image, for its points and to rank it first
  // A row for the page already open moves the view in place; true when it was handled.
  onPick?: (href: string) => boolean;
}

const TAGS: Record<RowKind, string> = { label: "Feature", stop: "Stop", image: "Image", point: "Point" };
const LIVE_MS = 500;
const GAP_REM = 0.5;
const EDGE_REM = 0.75;
const KEYS = "(min-width: 48rem) and (pointer: fine)";

const subscribeKeys = (onChange: () => void) => {
  const list = window.matchMedia(KEYS);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
};

// Q19: the instrument's own marks, so a row's kind reads before its tag.
const Glyph = ({ kind }: { kind: RowKind }) => (
  <svg className={styles.glyph} viewBox="-8 -8 16 16" data-glyph={kind} aria-hidden>
    {kind === "label" && <circle r="4.5" />}
    {kind === "stop" && <path d={bracketPath(12, 4)} />}
    {kind === "image" && <rect x="-6" y="-4.5" width="12" height="9" />}
    {kind === "point" && <path d="M0 -6.5V-2M0 2V6.5M-6.5 0H-2M2 0H6.5" />}
  </svg>
);

const editable = (el: EventTarget | null) =>
  el instanceof HTMLElement && !!el.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])");

// design.md 15.2: one search dialog per page, opened from its button or with "/".
const Search = ({ index, variant, buttonClassName, here, onPick }: SearchProps) => {
  const router = useRouter();
  const kiosk = useKiosk();
  const keysHint = useSyncExternalStore(subscribeKeys, () => window.matchMedia(KEYS).matches, () => false) && !kiosk;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [live, setLive] = useState("");
  const id = useId();
  const listId = `${id}-list`;
  const optionId = (i: number) => `${id}-option-${i}`;

  const outcome = useMemo(() => (isOpen ? search(index, query, here) : null), [isOpen, index, query, here]);
  const rows = outcome?.rows ?? [];

  // Q8 and Q9: measured, never guessed. A credit in the upper half of the screen moves the panel
  // to 0.5rem under it; one in the lower half ends the panel 0.5rem above it. From 48rem up the
  // panel also clears the viewer's top bar.
  const place = useCallback(() => {
    const d = dialogRef.current;
    if (!d?.open) return;
    d.style.removeProperty("--search-top");
    d.style.removeProperty("--search-max-h");
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const gap = GAP_REM * rem;
    const r = d.getBoundingClientRect();
    const css = getComputedStyle(d);
    let top = parseFloat(css.top);
    let bottom = window.innerHeight - EDGE_REM * rem;
    const across = (b: DOMRect) => b.width > 0 && b.height > 0 && b.left < r.right - 1 && b.right > r.left + 1;
    const wide = window.matchMedia("(min-width: 48rem)").matches;
    const groups = wide ? [...document.querySelectorAll("main > header > *")].map((e) => e.getBoundingClientRect()).filter(across) : [];
    for (const g of groups) if (g.bottom > top) top = g.bottom + gap;
    const credits = [...document.querySelectorAll("[data-credit]")]
      .map((e) => e.getBoundingClientRect())
      .filter((b) => across(b) && b.bottom > 0 && b.top < window.innerHeight)
      .sort((a, b) => a.top - b.top);
    for (const c of credits) {
      if (c.top < window.innerHeight / 2) top = Math.max(top, c.bottom + gap);
      else bottom = Math.min(bottom, c.top - gap);
    }
    d.style.setProperty("--search-top", `${top}px`);
    d.style.setProperty("--search-max-h", `${Math.max(0, bottom - top)}px`);
  }, []);

  const open = useCallback(
    (opener: Element | null) => {
      const d = dialogRef.current;
      if (!d || d.open) return;
      openerRef.current = opener instanceof HTMLElement ? opener : buttonRef.current;
      setQuery("");
      setActive(0);
      setLive("");
      d.showModal();
      setIsOpen(true);
      place();
      inputRef.current?.focus();
    },
    [place],
  );

  const close = useCallback((restore = true) => {
    const d = dialogRef.current;
    if (!d?.open) return;
    d.close();
    setIsOpen(false);
    const back = openerRef.current;
    if (restore) (back?.isConnected ? back : buttonRef.current)?.focus();
  }, []);

  // Q6: "/" opens search wherever focus is not in a text field, unless a dialog is up already.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      if (editable(e.target) || document.querySelector("dialog[open], [role=dialog]:not(dialog)")) return;
      e.preventDefault();
      open(document.activeElement);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [isOpen, place]);

  // Q26: the kiosk's idle countdown has to be reachable, and its reset starts over at Home.
  useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      if (root.hasAttribute("data-kiosk-countdown")) close(false);
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-kiosk-countdown"] });
    return () => observer.disconnect();
  }, [isOpen, close]);

  // Q17: the count is spoken once typing rests.
  const liveText = outcome?.live ?? "";
  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => setLive(liveText), LIVE_MS);
    return () => clearTimeout(timer);
  }, [isOpen, query, liveText]);

  useEffect(() => {
    document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // optionId only depends on the stable id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const go = useCallback(
    (href: string) => {
      close(false);
      if (onPick?.(href)) return;
      router.push(href);
    },
    [close, onPick, router],
  );

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.min(Math.max(0, rows.length - 1), Math.max(0, a + (e.key === "ArrowDown" ? 1 : -1))));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (rows[active]) go(rows[active].href);
    }
  };

  // Keys in the dialog stay in it: the viewer's own keys (Esc for About, J and K, E, C, L) never
  // see them.
  const onDialogKey = (e: KeyboardEvent<HTMLDialogElement>) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  // Q12: a press outside the panel lands on the dialog element itself, outside its box.
  const onDialogClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target !== e.currentTarget) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close();
  };

  const blocks = outcome?.blocks ?? [];
  const firstGroup = blocks.findIndex((b) => b.type === "group");
  let n = 0;
  const groups = blocks.flatMap((b, bi) =>
    b.type === "group"
      ? [
          <div key={b.label} role="group" aria-labelledby={`${id}-g${bi}`} className={styles.group}>
            <p id={`${id}-g${bi}`} className={styles.groupLabel} data-testid="search-group">
              {b.label}
            </p>
            {b.rows.map((row) => {
              const i = n++;
              return (
                <div
                  key={`${row.href}|${row.text}`}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  className={styles.row}
                  onClick={() => go(row.href)}
                  onPointerMove={() => setActive(i)}
                >
                  <Glyph kind={row.kind} />
                  <span className={styles.rowText}>
                    <span className={styles.name} data-testid="search-name">
                      {row.marks.map((m, k) => (m.strong ? <strong key={k}>{m.text}</strong> : <span key={k}>{m.text}</span>))}
                    </span>
                    {row.context && (
                      <span className={styles.context} data-testid="search-context">
                        {row.context}
                      </span>
                    )}
                  </span>
                  <span className={styles.kind} data-testid="search-kind">
                    {TAGS[row.kind]}
                  </span>
                </div>
              );
            })}
          </div>,
        ]
      : [],
  );
  const line = (text: string, k: number) => (
    <p key={`l${k}`} className={styles.line} data-testid="search-line">
      {text}
    </p>
  );
  const before = blocks.flatMap((b, k) => (b.type === "line" && (firstGroup < 0 || k < firstGroup) ? [line(b.text, k)] : []));
  const after = blocks.flatMap((b, k) => (b.type === "line" && firstGroup >= 0 && k > firstGroup ? [line(b.text, k)] : []));

  return (
    <>
      <dialog
        ref={dialogRef}
        className={styles.panel}
        aria-label="Search"
        data-variant={variant}
        onKeyDown={onDialogKey}
        onClick={onDialogClick}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <div className={styles.field}>
          <LuSearch className={styles.fieldIcon} aria-hidden />
          <label htmlFor={`${id}-input`} className={styles.visuallyHidden}>
            Search Solaria
          </label>
          <input
            ref={inputRef}
            id={`${id}-input`}
            className={styles.input}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={rows.length > 0}
            aria-controls={listId}
            aria-activedescendant={rows[active] ? optionId(active) : undefined}
            placeholder="Feature, stop, image, or x, y"
            maxLength={80}
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="off"
            enterKeyHint="go"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
          />
          <button type="button" className={styles.close} onClick={() => close()} aria-label="Close">
            <LuX aria-hidden />
          </button>
        </div>
        <div ref={bodyRef} className={styles.body}>
          {before}
          <div id={listId} role="listbox" aria-label="Search results" className={styles.list}>
            {groups}
          </div>
          {after}
        </div>
        {keysHint && (
          <p className={styles.keys} data-testid="search-keys">
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> Move
            </span>
            <span>
              <kbd>Enter</kbd> Open
            </span>
            <span>
              <kbd>Esc</kbd> Close
            </span>
          </p>
        )}
        <p role="status" className={styles.visuallyHidden}>
          {live}
        </p>
      </dialog>
      <button
        ref={buttonRef}
        type="button"
        className={variant === "header" ? styles.trigger : buttonClassName}
        aria-label="Search"
        aria-keyshortcuts="/"
        onClick={(e) => open(e.currentTarget)}
      >
        <LuSearch aria-hidden />
        {variant === "header" && (
          <>
            <span className={styles.triggerText}>Search</span>
            <kbd className={styles.keycap} aria-hidden="true">
              /
            </kbd>
          </>
        )}
      </button>
    </>
  );
};

export default Search;
