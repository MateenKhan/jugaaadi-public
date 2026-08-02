import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
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
export function IdleCore({ dense }: { dense?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const lines = dense ? 108 : 64

  useEffect(() => {
    const host = ref.current
    if (!host) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const bars = host.querySelectorAll<HTMLElement>('.idle-core__line')

    // A field of lines whose WIDTHS morph, staggered from the centre outwards.
    // The envelope is what the eye reads — diamond, then pinched, then wide —
    // and it comes free from `stagger(..., { from: 'center' })` plus a keyframe
    // list, rather than from choreographing 108 elements by hand.
    const field = animate(bars, {
      scaleX: [{ to: 0.12 }, { to: 1 }, { to: 0.38 }, { to: 0.9 }, { to: 0.2 }],
      opacity: [{ to: 0.25 }, { to: 0.85 }, { to: 0.4 }, { to: 0.75 }, { to: 0.3 }],
      duration: 4200,
      delay: stagger(16, { from: 'center' }),
      ease: 'inOut(2)',
      loop: true,
      alternate: true,
    })

    // A second, slower pass on a subset keeps it from ever looking periodic.
    const drift = animate(host, {
      scaleY: [1, 1.08, 0.96, 1],
      duration: 9000,
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
        <i key={i} className="idle-core__line" />
      ))}
    </div>
  )
}
