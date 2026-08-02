import { useEffect, useRef } from 'react'
import { animate, stagger, svg } from 'animejs'
import { MODULES } from './modules'

/**
 * The scroll dial: dense radial ticks, one coloured arc per module, and a core
 * that keeps drawing itself whether or not you are scrolling.
 *
 * Two things make this read the way the anime.js site does, and neither is the
 * scroll wiring:
 *
 *  1. DENSITY. A thin circle with a dozen dots looks like a widget. ~160 hairline
 *     ticks read as an instrument. They are cut with a repeating-conic-gradient
 *     MASK rather than 160 DOM nodes, and the lit portion is a second conic
 *     gradient driven by `--p` — so the sweep costs one composited layer and no
 *     JS at all, at any tick count.
 *
 *  2. IDLE MOTION. A page that is completely still whenever the reader stops
 *     scrolling feels dead. The core is a nest of ellipses animated with
 *     anime.js `createDrawable`, looping forever — the same `draw` technique the
 *     Scroll Observer demo uses — so there is always something breathing behind
 *     the module.
 */

const TICKS = 160

/** Per-module hues for the outer arc segments. */
const ARC_COLOURS = ['#ff5a36', '#3ddad7', '#a78bfa', '#facc15', '#4ade80', '#38bdf8']

export default function Dial({
  beat,
  beatCount,
  onJump,
}: {
  beat: number
  beatCount: number
  onJump: (beat: number) => void
}) {
  const coreRef = useRef<SVGSVGElement>(null)

  // The idle core. `createDrawable` turns each ellipse into something whose
  // stroke can be drawn from nothing and retracted again; staggering the set and
  // looping gives a continuous, non-repeating-looking swirl.
  useEffect(() => {
    const host = coreRef.current
    if (!host) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const drawables = svg.createDrawable(host.querySelectorAll('ellipse'))
    const anim = animate(drawables, {
      draw: ['0 0', '0 1', '1 1'],
      duration: 5200,
      delay: stagger(110),
      ease: 'inOut(3)',
      loop: true,
    })
    return () => {
      anim.pause()
    }
  }, [])

  // Where each module starts, as a fraction of the whole reel — this is what
  // makes the outer arcs line up with the ticks they describe.
  let running = 0
  const arcs = MODULES.map((m, i) => {
    const from = running / beatCount
    running += m.beats.length
    return { module: m, from, to: running / beatCount, colour: ARC_COLOURS[i % ARC_COLOURS.length], startBeat: running - m.beats.length }
  })

  return (
    <div className="dial__ring">
      {/* Outer: one arc per module. Clickable, so the dial is also the map. */}
      <div className="dial__arcs">
        {arcs.map((a) => (
          <button
            key={a.module.slug}
            type="button"
            className="dial__arc"
            style={{
              ['--from' as string]: `${a.from * 360}deg`,
              ['--to' as string]: `${a.to * 360}deg`,
              ['--hue' as string]: a.colour,
            }}
            onClick={() => onJump(a.startBeat)}
            aria-label={`Go to ${a.module.name}`}
          />
        ))}
      </div>

      {/* Middle: the dense tick ring. Lit portion follows `--p`. */}
      <div className="dial__ticks" style={{ ['--ticks' as string]: TICKS }} aria-hidden="true">
        <span className="dial__ticks-lit" />
      </div>

      {/* Inner: the idle core, behind the module. */}
      <svg className="dial__core" viewBox="0 0 200 200" ref={coreRef} aria-hidden="true">
        {Array.from({ length: 16 }).map((_, i) => (
          <ellipse
            key={i}
            cx="100"
            cy="100"
            rx={30 + i * 2.4}
            ry={62 - i * 0.6}
            transform={`rotate(${(i * 180) / 16} 100 100)`}
          />
        ))}
      </svg>

      {/* The beat head — a single marker riding the ring at the current point. */}
      <div className="dial__head" aria-hidden="true">
        <i />
      </div>

      <span className="dial__count">
        {beat + 1}
        <i>/{beatCount}</i>
      </span>
    </div>
  )
}
