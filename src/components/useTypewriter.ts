import { useLayoutEffect } from 'react';
import type { RefObject } from 'react';

/** Elements that fade in (with a shimmer) as one piece instead of being typed. */
const ATOMIC = '[data-atomic], img, hr, details, .katex-display, .katex';
/** Elements that simply appear when the typing reaches them. */
const INSTANT = 'br';

/** Typing speed. Lower is slower. */
const CHARS_PER_SECOND = 70;
/** Very long replies speed up so they never take longer than this to type. */
const MAX_TYPING_SECONDS = 25;
/** Pause after a table, code block, image, etc. has faded in. */
const ATOMIC_PAUSE_MS = 400;

interface Unit {
  kind: 'text' | 'atomic' | 'instant';
  node?: Text;
  el?: HTMLElement;
  full: string;
  pos: number;
  /** Elements between this unit and the root. */
  ancestors: HTMLElement[];
  /** Ancestors that first appear with this unit. */
  reveals: HTMLElement[];
  shown: boolean;
}

/**
 * Types out the rendered markdown inside `rootRef`.
 * Text is typed character by character; tables, code blocks, diagrams, images and math
 * fade in with a shimmer instead. Works on the DOM after render, so every markdown feature
 * (footnotes, math, highlighting) keeps working. Click the message to skip.
 */
export default function useTypewriter(rootRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const units: Unit[] = [];
    const originalDisplay = new Map<HTMLElement, string>();
    const registered = new Set<HTMLElement>();

    const hide = (el: HTMLElement) => {
      if (!originalDisplay.has(el)) originalDisplay.set(el, el.style.display);
      el.style.display = 'none';
    };
    const unhide = (el: HTMLElement) => {
      el.style.display = originalDisplay.get(el) ?? '';
    };

    const push = (unit: Unit) => {
      for (const ancestor of unit.ancestors) {
        if (!registered.has(ancestor)) {
          registered.add(ancestor);
          hide(ancestor);
          unit.reveals.push(ancestor);
        }
      }
      if (unit.el) hide(unit.el);
      if (unit.node) unit.node.nodeValue = '';
      units.push(unit);
    };

    const walk = (parent: Node, stack: HTMLElement[]) => {
      for (const child of Array.from(parent.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.nodeValue ?? '';
          if (text.trim() === '') continue; // whitespace between elements stays as it is
          push({
            kind: 'text',
            node: child as Text,
            full: text,
            pos: 0,
            ancestors: [...stack],
            reveals: [],
            shown: false,
          });
        } else if (child instanceof HTMLElement) {
          if (child.matches(ATOMIC)) {
            push({ kind: 'atomic', el: child, full: '', pos: 0, ancestors: [...stack], reveals: [], shown: false });
          } else if (child.matches(INSTANT)) {
            push({ kind: 'instant', el: child, full: '', pos: 0, ancestors: [...stack], reveals: [], shown: false });
          } else {
            walk(child, [...stack, child]);
          }
        }
      }
    };

    walk(root, []);
    if (units.length === 0) return;

    const total = units.reduce((n, u) => n + u.full.length, 0);
    const charsPerMs = Math.max(CHARS_PER_SECOND, total / MAX_TYPING_SECONDS) / 1000;

    const caret = document.createElement('span');
    caret.className = 'nova-caret';
    caret.setAttribute('aria-hidden', 'true');
    let caretNode: Node | null = null;
    const moveCaret = (node: Text) => {
      if (caretNode === node) return;
      caretNode = node;
      node.parentNode?.insertBefore(caret, node.nextSibling);
    };

    const reveal = (unit: Unit) => {
      if (unit.shown) return;
      unit.shown = true;
      unit.reveals.forEach((el) => unhide(el));
      if (unit.el) {
        unhide(unit.el);
        if (unit.kind === 'atomic') unit.el.classList.add('nova-reveal');
      }
    };

    let raf = 0;
    const finish = (skipping: boolean) => {
      cancelAnimationFrame(raf);
      root.removeEventListener('click', skip);
      caret.remove();
      for (const unit of units) {
        if (unit.node) unit.node.nodeValue = unit.full;
        if (skipping && unit.el) unit.el.classList.remove('nova-reveal');
      }
      originalDisplay.forEach((value, el) => {
        el.style.display = value;
      });
    };
    const skip = () => finish(true);
    root.addEventListener('click', skip);

    let index = 0;
    let carry = 0;
    let wait = 0;
    let last = performance.now();

    const tick = (now: number) => {
      let dt = Math.min(now - last, 64);
      last = now;

      if (wait > 0) {
        wait -= dt;
        if (wait > 0) {
          raf = requestAnimationFrame(tick);
          return;
        }
        dt = -wait;
        wait = 0;
      }

      carry += dt * charsPerMs;

      while (index < units.length) {
        const unit = units[index];
        reveal(unit);

        if (unit.kind === 'text' && unit.node) {
          const n = Math.min(Math.floor(carry), unit.full.length - unit.pos);
          if (n > 0) {
            unit.pos += n;
            carry -= n;
            unit.node.nodeValue = unit.full.slice(0, unit.pos);
            moveCaret(unit.node);
          }
          if (unit.pos < unit.full.length) break; // out of budget for this frame
          index++;
        } else {
          index++;
          if (unit.kind === 'atomic') {
            wait = ATOMIC_PAUSE_MS;
            carry = 0;
            break;
          }
        }
      }

      if (index >= units.length) finish(false);
      else raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => finish(true);
  }, [rootRef, enabled]);
}
