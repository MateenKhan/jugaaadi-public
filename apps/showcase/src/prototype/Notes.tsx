import { useEffect, useRef } from 'react'
import { animate, stagger, svg } from 'animejs'
import type { Note } from './modules'

/**
 * Technical-drawing callouts: a leader line from a point on the visual out to a
 * label in the margin, drawn in when the beat becomes active.
 *
 * This replaces free-floating pills, which were the real problem with the
 * previous version — a chip reading "3 rows" communicates nothing if it is not
 * visibly ATTACHED to the three rows it describes. A leader line makes the
 * label a statement about a specific part rather than a caption hovering
 * nearby.
 *
 * The lines are `createDrawable`s so they can be stroked on rather than faded
 * in; drawing reads as the diagram assembling itself, which is exactly the
 * effect the reference gets.
 */

const REDUCED =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Leader geometry, in the module's 0–100 box.
 *
 * Anchor → a short diagonal → a long horizontal run out to the margin. The
 * horizontal final segment is what makes the label read as attached rather than
 * merely near: the eye follows a straight rule to its end.
 */
const REACH = 15 // % of the module box the leader extends past its edge

function leader(note: Note): string {
  const endX = note.side === 'left' ? -REACH : 100 + REACH
  const elbowX = note.side === 'left' ? Math.min(note.x - 10, 4) : Math.max(note.x + 10, 96)
  return `M ${note.x} ${note.y} L ${elbowX} ${note.labelY} L ${endX} ${note.labelY}`
}

export default function Notes({
  notes,
  beat,
  startDelay = 0,
}: {
  notes: Note[]
  beat: number
  /** Holds the callouts back on first load until the dial and copy have landed. */
  startDelay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = ref.current
    if (!host || REDUCED || !notes.length) return
    // See the note in Prototype's Callout: a reveal started while the document
    // is hidden sets its `from` state and then stalls, leaving the labels
    // invisible for good.
    if (document.visibilityState !== 'visible') return

    const paths = svg.createDrawable(host.querySelectorAll('path'))
    const line = animate(paths, {
      draw: ['0 0', '0 1'],
      duration: 700,
      delay: stagger(110, { start: startDelay }),
      ease: 'out(3)',
    })

    // Labels arrive just behind their own line, so each one reads as the line
    // reaching its destination rather than as a separate fade.
    const labels = animate(host.querySelectorAll('.note__label'), {
      opacity: [0, 1],
      x: notes.map((n) => (n.side === 'left' ? -12 : 12)),
      duration: 460,
      delay: stagger(110, { start: startDelay + 260 }),
      ease: 'out(2)',
    })

    const dots = animate(host.querySelectorAll('.note__dot'), {
      opacity: [0, 1],
      scale: [0, 1],
      duration: 380,
      delay: stagger(110, { start: startDelay }),
      ease: 'out(3)',
    })

    return () => {
      // Reverted, not paused — a paused reveal leaves its targets stranded at
      // the `from` state, and StrictMode's double invoke would stack two.
      line.revert()
      labels.revert()
      dots.revert()
    }
  }, [beat, notes, startDelay])

  if (!notes.length) return null

  return (
    <div className="notes" ref={ref} aria-hidden="true">
      <svg className="notes__lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        {notes.map((n, i) => (
          <g key={`${n.text}-${i}`}>
            <path d={leader(n)} />
          </g>
        ))}
      </svg>

      {/* Dots sit at the anchors, in the SAME 0-100 space but as HTML, so they
          stay circular — the SVG is stretched by preserveAspectRatio="none". */}
      {notes.map((n, i) => (
        <span
          key={`dot-${n.text}-${i}`}
          className="note__dot"
          style={{ left: `${n.x}%`, top: `${n.y}%` }}
        />
      ))}

      {notes.map((n, i) => (
        <span
          key={`label-${n.text}-${i}`}
          className={`note__label note__label--${n.side}`}
          style={{ top: `${n.labelY}%` }}
        >
          {n.text}
        </span>
      ))}
    </div>
  )
}
