# Motion prototype — handoff

A scroll-driven showcase reel, standalone at **`/prototype.html`**. Not linked
from the shell, marked `noindex`, and it touches none of the existing tabs.

```bash
npm run dev          # from the repo root
# http://localhost:5180/prototype.html
```

Delete `apps/showcase/src/prototype/`, its entry in `vite.config.ts` and
`prototype.html` to remove it entirely. Nothing else imports it.

---

## What it is

Five libraries, fifteen "beats", one continuous scroll. Each beat states one
feature, animates the live component to demonstrate it, and annotates it with
leader-line callouts. Finishing a module hands over to the next.

Order is **Joystick → Folder Tree → Scroll Input → AI Providers → Table**.
Table is last on purpose: it is the only rectangular module and the only one
using the flat progress strip, so it closes rather than interrupting the four
that share the circle.

---

## Architecture

### The scroll engine (`useReel.ts`)

One `requestAnimationFrame` loop reads `window.scrollY` and writes **CSS custom
properties** to `<html>`:

| var | meaning |
| --- | --- |
| `--t` | 0–1 within the current beat, eased |
| `--p` | 0–1 across the whole page |
| `--mv` `--sc` `--op` | the module handoff: lift, scale, opacity |

**Continuous motion never goes through React.** The obvious version calls
`setState` every frame and re-renders the whole stage 60 times a second while
anime.js is also running. Instead the smooth part is a CSS variable and the
visuals consume it in `calc()`, so the compositor does the work. React is told
only about things that change the *tree*: `beat`, a coarse 0–7 `step` for
reveals CSS cannot express, and one `started` flag. That is roughly 15 renders
across the whole page instead of thousands.

**Scroll is scrubbed, never hijacked.** The wheel is never swallowed. Dragging
the scrollbar backwards rewinds everything exactly, which is also what makes it
debuggable.

### Why the scroll layer is not anime.js

It was converted to `onScroll({ sync })` and reverted — see commits `f529adb`
and `aaa3f2a`.

`onScroll` maps an animation onto a real element travelling through the
viewport. That is the right model for a page that scrolls its own content. This
page is the opposite: a **fixed stage over a synthetic runway**, where scroll
position means "how far through the beat list are we" and nothing physically
moves. Bridging the two needed invisible marker spans and threshold guesswork,
and the transition stopped firing.

anime.js keeps what it is genuinely better at — the load-in timeline, the
typewriter and slide staggers, the leader lines via `svg.createDrawable`. Those
are discrete, element-local moments.

The one thing lost is `sync`'s damping. If the raw-scroll version ever feels
jittery, add a lerp to the values in `writeSwap` — a few lines, not a different
architecture.

### Beat shaping

`shape()` in `useReel.ts` is **deliberately asymmetric**:

- **2% lead-in.** An earlier version held 18% at *both* ends, so 36% of every
  beat produced no movement at all and the rest ran at 4.67× scroll speed to
  catch up. Push the wheel, nothing happens, then it snaps past you.
- **Completes at 55%, then holds still for 45%.** The stop is what gives a beat
  weight. Motion that runs to the boundary and hands straight over has nothing
  land. Rest is choreography, not the absence of it.

### The dial (`Dial.tsx`, `.dial__*` in `prototype.css`)

Layered back to front: sunken disc → module → coloured arcs → tick bezel →
hairline arcs → glass dome.

- **Tick density is free.** 180 ticks are cut with a `repeating-conic-gradient`
  *mask*, not 180 DOM nodes. The lit portion is a second gradient clipped by
  `--p`.
- **`closest-side` is load-bearing** on every radial mask. A bare `circle` sizes
  to farthest-*corner*, so percentage stops are measured along the diagonal
  (~1.41× the radius) and bands land outside the element entirely. This cost an
  hour once.
- **The tick bezel needs two mask layers intersected** — its radial band plus
  its reveal wedge. Replacing rather than intersecting loses the band and fills
  the whole disc.
- **Nothing animates in the centre.** That is where the real component lives.
  Idle movement is the three hairline arcs drifting on a CSS keyframe — motion
  at the edge, content in the middle.

`progress: 'ring' | 'bar'` per module. A ring around a spreadsheet crops it and
fights the shape, so rectangular modules get the same instrument laid out flat.

### Entrance (`Prototype.tsx`)

Plays once, on a fresh load, from the top. Different motion per role — giving
everything the same fade is what made an earlier version read as one wash
however long it ran:

1. disc arrives (fast — a flat black circle has nothing to watch while it grows)
2. coloured arcs **draw round, clockwise**
3. tick bezel **draws anticlockwise** — two rings against each other read as a
   mechanism engaging; the same way is one slow wipe
4. module appears
5. heading **types**, character by character, caret retires after the last one
6. copy **slides** in from the left
7. callouts **draw** last — annotating a diagram before it exists is backwards

### Content (`modules.ts`)

One file. Per beat: `headline`, `body`, exactly **three** `bullets`, optional
`code`, optional `notes` (leader-line callouts with `x`/`y` anchors as
percentages of the module box).

Three bullets is a rule, not a coincidence — a fourth always wants a fifth, and
restraint is most of what makes the layout breathe.

---

## What is real and what is not

| | |
| --- | --- |
| **Real** | All five components. The joystick drags and reports computed deltas; the tree re-parents via `moveNodes`; the input parses `5' 6"`; the provider grid is the `PROVIDERS` registry and its free-tier count is computed at render |
| **Placeholder** | Every headline, body, bullet and code snippet in `modules.ts` |

**Table renders in an iframe.** Its stylesheet is a compiled Tailwind bundle
carrying preflight *and* `html, body, #root { overflow: hidden }` — importing it
here would reset this page's typography and stop it scrolling, which is fatal
for a scroll-driven reel. Same call the main showcase makes.

---

## Tuning

Single numbers, deliberately:

| what | where | now |
| --- | --- | --- |
| Entire entrance speed | `LOAD_SCALE` in `Prototype.tsx` | `1.9` |
| When the heading types | `TEXT_AFTER_DIAL` | derived from `LOAD_SCALE` |
| Handoff length | `SWAP_W` in `useReel.ts` | `0.55` beats each side |
| Handoff lift / depth | `SWAP_LIFT` / `SWAP_MIN` | `190px` / `0.5` |
| Still screens before beat 1 | `INTRO` | `0.6` |
| Scroll per beat | `runway` height in `Prototype.tsx` | `100vh` |

---

## Known issues

1. **Callout anchors are stale.** The `x`/`y` coordinates in `modules.ts` were
   authored against the placeholder shapes. Several now point at the wrong part
   of the real component. Most visible outstanding problem.
2. **Joystick chrome overflows the circle.** Its TRANSFORM panel and readout are
   rectangular and push past the ring at top-right and bottom.
3. **Component sizes are first guesses.** Tree capped at 300px, joystick at
   190px. Needs per-breakpoint attention.
4. **Five libraries' global CSS now share one document.** Watch for collisions,
   particularly between the tree and the scroll input.
5. **Only 3 of 15 beats have callouts authored.**
6. **Mobile is untested.** Layout restacks below 820px but nothing has been
   verified on a real device, and the reel is touch-scrolled there.

## Verification notes

Typecheck is clean and there are no console errors.

**The motion itself is largely unverified by me.** The automated browser tab
runs backgrounded, where Chrome suspends `requestAnimationFrame` entirely
(measured: 0 frames). anime.js's engine cannot tick, so entrance and beat
reveals never play in it. What was verified is geometry, computed styles, mask
composition, resource loading, and the easing curves checked numerically in
Node.

Two consequences worth keeping in mind:

- Anything about *feel* — pacing, whether a transition lands — came from the
  author's review, not from measurement.
- Entrance reveals are guarded with `document.visibilityState !== 'visible'`.
  anime.js writes the `from` state immediately and then advances on rAF, so
  starting a reveal in a hidden tab sets the copy to `opacity: 0` and leaves it
  there permanently. Keep that guard.
