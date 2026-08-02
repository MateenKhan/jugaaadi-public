import { useEffect, useRef, useState } from 'react'

/**
 * Turns scroll position into a beat index plus a continuous 0–1 within it.
 *
 * Scroll is SCRUBBED, never hijacked. The page scrolls exactly as far as the
 * browser says and the wheel is never swallowed — this only reads position.
 * That is deliberate: the fastest way to make a site feel broken is to fight
 * someone's trackpad, and a reel that can only run forwards at the author's
 * pace is worse than none. Scrubbing also means dragging the scrollbar
 * backwards rewinds the animation exactly.
 *
 * ── Why the continuous value never goes through React ──────────────────────
 *
 * The obvious version calls setState every frame, which re-renders the whole
 * stage 60 times a second while anime.js is also running. Instead the smooth
 * part is written straight to a CSS custom property on <html> — `--t` — and the
 * visuals consume it in `calc()`. The compositor does the work, React does
 * none, and the frame cost stops scaling with how much is on screen.
 *
 * React is only told about things that genuinely change the TREE:
 *   • `beat`    — which beat is active (≈15 times over the whole page)
 *   • `step`    — a coarse 0–7 slice, for discrete reveals a CSS var can't do
 *   • `started` — one flip, to retire the scroll hint
 */

const STEPS = 8

export type ReelState = {
  beat: number
  step: number
  started: boolean
}

/**
 * Shape a beat's raw 0–1 into the value the visuals read.
 *
 * DELIBERATELY ASYMMETRIC, and both halves matter.
 *
 * The lead-in is tiny (2%) because scrubbed motion lives or dies on feeling
 * attached to the input. An earlier version held 18% at BOTH ends: measured,
 * 1% down the page gave t=0.000 and 3% still gave t=0.000, so 36% of every
 * beat produced no movement and the rest ran at 4.67x scroll speed to catch
 * up. Push the wheel, nothing happens, then it snaps past you.
 *
 * The DWELL is the opposite lesson. Motion that runs right up to the beat
 * boundary and immediately hands over to the next has no weight — everything
 * slides continuously and nothing lands. So the movement completes by 55% and
 * then holds, still, for the remaining 45%. That stop is what gives a beat its
 * punctuation: the eye catches up, reads the callout, and only then moves on.
 * Rest is part of the choreography, not absence of it.
 */
const LEAD_IN = 0.02
const SETTLE_AT = 0.55

/** Screens of still page before the first beat starts moving. */
export const INTRO = 0.6

function shape(t: number): number {
  if (t <= LEAD_IN) return 0
  if (t >= SETTLE_AT) return 1
  const u = (t - LEAD_IN) / (SETTLE_AT - LEAD_IN)
  return u * u * (3 - 2 * u)
}

/**
 * How far either side of a module boundary the handoff runs, in beats.
 *
 * It eats into the DWELL at the end of the outgoing beat and the lead-in of the
 * incoming one, which is the right place for it: nothing else is moving there,
 * so the swap gets the stage to itself.
 */
export const SWAP_W = 0.3

/**
 * Writes the module handoff to CSS variables.
 *
 * Computed HERE, from the beat coordinate, rather than through anime.js's
 * ScrollObserver — which was tried and reverted. `onScroll` maps an animation
 * onto a real element passing through the viewport, which is the right model
 * for a document that scrolls its own content. This page is the opposite: a
 * FIXED stage over a synthetic runway, where scroll position means "how far
 * through the beat list are we" and nothing physically travels. Bridging those
 * needed invisible marker elements and threshold guesswork, and the transition
 * stopped firing. Scroll position is already the source of truth here, so
 * deriving the swap from it directly is not a workaround — it is the shape of
 * the problem.
 */
export function writeSwap(root: HTMLElement, scaled: number, boundaries: number[]) {
  let mv = 0
  let sc = 1
  let op = 1

  for (const b of boundaries) {
    const d = scaled - b
    if (d < -SWAP_W || d > SWAP_W) continue

    if (d < 0) {
      const p = (d + SWAP_W) / SWAP_W // 0 → 1 as it leaves
      mv = -p * 90
      sc = 1 - p * 0.22
      op = 1 - p * 0.85
    } else {
      const q = d / SWAP_W // 0 → 1 as it arrives
      mv = (1 - q) * 90
      sc = 0.78 + q * 0.22
      op = 0.15 + q * 0.85
    }
    break
  }

  root.style.setProperty('--mv', mv.toFixed(2))
  root.style.setProperty('--sc', sc.toFixed(4))
  root.style.setProperty('--op', op.toFixed(3))
}

export function useReel(beatCount: number, boundaries: number[] = []): ReelState {
  const [state, setState] = useState<ReelState>({ beat: 0, step: 0, started: false })
  const lastRef = useRef('')

  useEffect(() => {
    const root = document.documentElement
    let raf = 0

    const read = () => {
      const max = root.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0

      // A still runway before the first beat. Animation that starts the instant
      // the page loads gives the reader nothing to arrive at — they are still
      // orienting while the first thing is already over. This buys a screen of
      // calm, and the hint invites the scroll that starts the reel.
      const scaled = progress * (beatCount + INTRO) - INTRO
      const beat = Math.min(beatCount - 1, Math.max(0, Math.floor(scaled)))
      const within = scaled < 0 ? 0 : Math.min(1, Math.max(0, scaled - beat))
      const eased = shape(within)

      // Continuous channels — compositor only, no React.
      root.style.setProperty('--t', eased.toFixed(4))
      root.style.setProperty('--p', progress.toFixed(5))
      writeSwap(root, scaled, boundaries)

      const step = Math.min(STEPS - 1, Math.floor(eased * STEPS))
      const started = window.scrollY > 8
      const key = `${beat}|${step}|${started}`
      if (key !== lastRef.current) {
        lastRef.current = key
        setState({ beat, step, started })
      }

      raf = requestAnimationFrame(read)
    }

    raf = requestAnimationFrame(read)
    return () => {
      cancelAnimationFrame(raf)
      for (const v of ['--t', '--p', '--mv', '--sc', '--op']) root.style.removeProperty(v)
    }
    // Joined so a fresh array with identical contents does not restart the loop.
  }, [beatCount, boundaries.join(',')])

  return state
}

/** Jump to a beat. The rail stays a plain menu — clicking always works. */
export function scrollToBeat(beat: number, beatCount: number) {
  const root = document.documentElement
  const max = root.scrollHeight - window.innerHeight
  // Land in the beat's DWELL, where the motion has completed and the callouts
  // are readable — parking on the boundary shows a beat that has not happened.
  const target = ((beat + INTRO + 0.7) / (beatCount + INTRO)) * max
  window.scrollTo({
    top: target,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
  })
}
