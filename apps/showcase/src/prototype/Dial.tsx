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

/* The line-field core that used to live here is gone. It sat exactly where the
   real component goes, so on the flat modules it rendered as a donut over the
   grid and on the round ones it would have competed with the joystick.

   The page still should not freeze solid when the reader stops scrolling, so
   the hairline arcs drift instead — motion at the edge, content in the centre.
   That is a plain CSS keyframe (see .dial__inner in prototype.css): three
   elements rotating forever needs no timeline, and the compositor runs it
   whether or not any JS is alive. */
