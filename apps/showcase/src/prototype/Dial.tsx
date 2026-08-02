import { useEffect, useRef } from 'react'
import { animate, stagger, spring } from 'animejs'
import { MODULES, type Module } from './modules'

/**
 * Scroll progress, in whichever shape suits the module.
 *
 * `ring` wraps round content (the joystick, the provider constellation).
 * `bar` is the same instrument idiom laid out flat, for content that is
 * rectangular — a spreadsheet or a file tree. Wrapping a circle round a grid
 * crops it and fights the shape, which is why the variant exists at all.
 *
 * Both share the same trick: ticks are cut with a repeating-conic (or repeating-
 * linear) gradient MASK rather than one DOM node per tick, so density is free,
 * and the lit portion is a second gradient clipped by `--p`. The sweep is
 * therefore a composited layer that costs no JS at any tick count.
 */

const RING_TICKS = 180
const BAR_TICKS = 90

const ARC_COLOURS = ['#ff5a36', '#3ddad7', '#a78bfa', '#facc15', '#4ade80', '#38bdf8']

export default function Dial({
  module,
  beat,
  beatCount,
  onJump,
}: {
  module: Module
  beat: number
  beatCount: number
  onJump: (beat: number) => void
}) {
  // Where each module starts, so arcs/segments line up with what they describe.
  let running = 0
  const arcs = MODULES.map((m, i) => {
    const from = running / beatCount
    const startBeat = running
    running += m.beats.length
    return {
      module: m,
      from,
      to: running / beatCount,
      colour: ARC_COLOURS[i % ARC_COLOURS.length],
      startBeat,
    }
  })

  return module.progress === 'ring' ? (
    <RingProgress arcs={arcs} onJump={onJump} beat={beat} beatCount={beatCount} />
  ) : (
    <BarProgress arcs={arcs} onJump={onJump} beat={beat} beatCount={beatCount} />
  )
}

type Arc = {
  module: Module
  from: number
  to: number
  colour: string
  startBeat: number
}
type Props = { arcs: Arc[]; beat: number; beatCount: number; onJump: (b: number) => void }

/* ── ring ─────────────────────────────────────────────────────────────────── */

function RingProgress({ arcs, beat, beatCount, onJump }: Props) {
  return (
    <>
      {/* Depth layers are SIBLINGS of the ring, not children of it: the disc is
          opaque, so nesting it inside the ring layer painted it over the module
          and the core and emptied the middle of the dial. */}
      <span className="dial__disc" aria-hidden="true" />

      {/* Three offset hairline arcs, lower right — the reference's depth trick.
          Each is a circle with only two borders coloured, then rotated, which
          is far cheaper than stroking real arcs and reads identically. */}
      <span className="dial__inner" aria-hidden="true">
        {[
          { r: 0, a: 12 },
          { r: 3, a: 26 },
          { r: 6, a: 40 },
        ].map((s) => (
          <i key={s.r} style={{ ['--r' as string]: s.r, ['--a' as string]: s.a }} />
        ))}
      </span>

      <span className="dial__dome" aria-hidden="true" />

      <div className="dial__ring">
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

      <div className="dial__ticks" style={{ ['--ticks' as string]: RING_TICKS }} aria-hidden="true">
        <span className="dial__ticks-lit" />
      </div>

        <div className="dial__head" aria-hidden="true">
          <i />
        </div>

        <span className="dial__count">
          {beat + 1}
          <i>/{beatCount}</i>
        </span>
      </div>
    </>
  )
}

/* ── bar ──────────────────────────────────────────────────────────────────── */

function BarProgress({ arcs, beat, beatCount, onJump }: Props) {
  return (
    <div className="bar">
      <div className="bar__segments">
        {arcs.map((a) => (
          <button
            key={a.module.slug}
            type="button"
            className="bar__segment"
            style={{
              flexGrow: a.module.beats.length,
              ['--hue' as string]: a.colour,
            }}
            onClick={() => onJump(a.startBeat)}
            aria-label={`Go to ${a.module.name}`}
          />
        ))}
      </div>

      <div className="bar__ticks" style={{ ['--ticks' as string]: BAR_TICKS }} aria-hidden="true">
        <span className="bar__ticks-lit" />
        <span className="bar__head" />
      </div>

      <span className="bar__count">
        {beat + 1}
        <i>/{beatCount}</i>
      </span>
    </div>
  )
}

/**
 * The idle core — a nest of ellipses continuously drawn and retracted with
 * anime.js `createDrawable`.
 *
 * Split out of the ring because it is not progress: it is the reason the page
 * is never completely still. A composition that freezes the moment the reader
 * stops scrolling reads as dead, so this loops regardless of scroll and sits
 * behind whichever module is on stage.
 */
/**
 * Lens envelope: how wide line `i` is at rest.
 *
 * This is the difference between a BLOB and a stack of stripes. Uniform-width
 * lines read as a rendering artifact — which is exactly what the previous
 * version looked like. Weighting each line by its distance from the centre
 * gives the field a silhouette, and the animation then morphs that silhouette
 * rather than inventing one.
 */
function lens(i: number, n: number): number {
  const u = i / (n - 1) // 0..1
  return Math.pow(Math.sin(Math.PI * u), 0.62)
}

export function IdleCore({ dense }: { dense?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const lines = dense ? 116 : 72

  useEffect(() => {
    const host = ref.current
    if (!host) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const bars = host.querySelectorAll<HTMLElement>('.idle-core__line')

    // The morph. Staggering from the centre is what makes the silhouette pulse
    // outwards rather than every line moving in lockstep; `spring` gives it a
    // settle instead of a mechanical ease, which is most of why the reference
    // feels alive rather than looped.
    const field = animate(bars, {
      scaleX: [{ to: 0.35 }, { to: 1.12 }, { to: 0.55 }, { to: 0.95 }, { to: 0.42 }],
      duration: 4600,
      delay: stagger(13, { from: 'center' }),
      ease: spring({ bounce: 0.28, duration: 900 }),
      loop: true,
      alternate: true,
    })

    // A slow independent breath on the whole field, so the two cycles drift
    // against each other and it never reads as a short loop.
    const drift = animate(host, {
      scaleY: [1, 1.07, 0.95, 1],
      rotate: [-1.2, 1.2, -1.2],
      duration: 11000,
      ease: 'inOut(2)',
      loop: true,
    })

    return () => {
      field.pause()
      drift.pause()
    }
  }, [lines])

  return (
    <div className={`idle-core${dense ? ' idle-core--dense' : ''}`} ref={ref} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <i
          key={i}
          className="idle-core__line"
          style={{ width: `${(lens(i, lines) * 100).toFixed(2)}%` }}
        />
      ))}
    </div>
  )
}
