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

/** Ease-in-out over the middle of a beat, flat at either end, so a beat settles
 *  rather than drifting continuously — drift reads as sluggish. */
function shape(t: number): number {
  const HOLD = 0.18
  if (t <= HOLD) return 0
  if (t >= 1 - HOLD) return 1
  const u = (t - HOLD) / (1 - HOLD * 2)
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2
}

export function useReel(beatCount: number): ReelState {
  const [state, setState] = useState<ReelState>({ beat: 0, step: 0, started: false })
  const lastRef = useRef('')

  useEffect(() => {
    const root = document.documentElement
    let raf = 0

    const read = () => {
      const max = root.scrollHeight - window.innerHeight
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0

      const scaled = progress * beatCount
      const beat = Math.min(beatCount - 1, Math.floor(scaled))
      const within = Math.min(1, Math.max(0, scaled - beat))
      const eased = shape(within)

      // Continuous channels — compositor only, no React.
      root.style.setProperty('--t', eased.toFixed(4))
      root.style.setProperty('--p', progress.toFixed(5))

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
      root.style.removeProperty('--t')
      root.style.removeProperty('--p')
    }
  }, [beatCount])

  return state
}

/** Jump to a beat. The rail stays a plain menu — clicking always works. */
export function scrollToBeat(beat: number, beatCount: number) {
  const root = document.documentElement
  const max = root.scrollHeight - window.innerHeight
  // Land a little into the beat so its animation is already resolving, rather
  // than parking on the boundary where nothing has happened yet.
  const target = ((beat + 0.4) / beatCount) * max
  window.scrollTo({
    top: target,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth',
  })
}
