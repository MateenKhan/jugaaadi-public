import type { Module } from './modules'

/**
 * Placeholder stage visuals — abstract stand-ins for the real components.
 *
 * Continuous motion is NOT passed in as a prop. It arrives as the `--t` CSS
 * variable that `useReel` writes each frame, and the transforms below consume it
 * in `calc()`, so scrubbing costs a compositor update rather than a React
 * render. What React does get is `step` — a coarse 0–7 slice — for the discrete
 * reveals that CSS alone can't express, like "how many cells have filled".
 *
 * `data-beat` on the wrapper is what lets the stylesheet apply a different
 * continuous behaviour per beat without any of it reaching JS.
 */

const STEPS = 8

type Props = {
  module: Module
  /** Which beat of THIS module is active. */
  beat: number
  /** Coarse 0–7 progress within the beat. */
  step: number
}

export default function Visual({ module, beat, step }: Props) {
  switch (module.visual) {
    case 'ring':
      return <RingVisual beat={beat} />
    case 'grid':
      return <GridVisual beat={beat} step={step} />
    case 'tree':
      return <TreeVisual beat={beat} step={step} />
    case 'slider':
      return <SliderVisual beat={beat} step={step} />
    default:
      return <NodesVisual beat={beat} step={step} />
  }
}

type V = { beat: number; step: number }

/* ── Joystick ─────────────────────────────────────────────────────────────── */

// No `step`: every one of this visual's continuous channels is expressed in CSS
// against `--t`, so it only re-renders when the beat itself changes.
function RingVisual({ beat }: { beat: number }) {
  return (
    <div className="viz viz--ring" data-beat={beat}>
      <div className="viz-ring__base">
        <span className="viz-ring__track" />
        <span className="viz-ring__axis viz-ring__axis--y" />
        <span className="viz-ring__axis viz-ring__axis--x" />
        <span className="viz-ring__thumb" />
      </div>

      {/* The synthetic hand. In the real reel this rides the same path while
          driving genuine pointer events into the live component. */}
      <span className="viz-cursor" aria-hidden="true">
        <Hand />
      </span>

      <div className="viz-chips">
        <Chip on={beat >= 1} label="rotate" />
        <Chip on={beat >= 2} label="z axis" />
        <Chip on={beat >= 3} label="headless" />
      </div>
    </div>
  )
}

/* ── Table ────────────────────────────────────────────────────────────────── */

function GridVisual({ beat, step }: V) {
  const filled = beat === 0 ? Math.round((step / (STEPS - 1)) * 6) : 0

  return (
    <div className="viz viz--grid" data-beat={beat}>
      <div className="viz-grid">
        {Array.from({ length: 24 }).map((_, i) => {
          const col = i % 6
          const row = Math.floor(i / 6)
          const inSeries = col === 2 && row < filled
          const isRef = beat === 1 && col === 2 && (row === 1 || row === 2)
          const inRowSel = beat === 2 && row >= 1 && row <= 2
          return (
            <span
              key={i}
              className={`viz-cell${inSeries ? ' is-filled' : ''}${isRef ? ' is-ref' : ''}${
                inRowSel ? ' is-sel' : ''
              }`}
            >
              {inSeries ? (row + 1) * 2 : ''}
            </span>
          )
        })}
      </div>
      <div className="viz-chips">
        <Chip on={beat === 0 && step > 2} label="+2 step" />
        <Chip on={beat === 1} label="=C4+C3" />
        <Chip on={beat === 2} label="3 rows" />
      </div>
    </div>
  )
}

/* ── Folder tree ──────────────────────────────────────────────────────────── */

const TREE_ROWS = ['Scene', 'Environment', 'Sun', 'Furniture', 'Chair A', 'Chair B', 'Walls']
const TREE_DEPTH = [0, 1, 2, 1, 2, 2, 1]

function TreeVisual({ beat, step }: V) {
  return (
    <div className="viz viz--tree" data-beat={beat}>
      <div className="viz-tree">
        {TREE_ROWS.map((label, i) => {
          const dragged = beat === 0 && i === 4
          const hit = beat === 1 && (i === 2 || i === 4)
          return (
            <span
              key={label}
              className={`viz-row${dragged ? ' is-drag' : ''}${hit ? ' is-hit' : ''}${
                beat === 2 && i === 5 ? ' is-focus' : ''
              }`}
              style={{ paddingLeft: `${8 + TREE_DEPTH[i] * 16}px` }}
            >
              <i className="viz-row__dot" />
              {label}
            </span>
          )
        })}
      </div>
      <div className="viz-chips">
        <Chip on={beat === 0 && step > 3} label="re-parented" />
        <Chip on={beat === 1} label="2 matches" />
        <Chip on={beat === 2} label="keyboard" />
      </div>
    </div>
  )
}

/* ── Scroll input ─────────────────────────────────────────────────────────── */

function SliderVisual({ beat, step }: V) {
  const scrubbed = Math.round(400 + (step / (STEPS - 1)) * 1400)
  const value = beat === 0 ? scrubbed : beat === 1 ? 1676 : 5100
  const text = beat === 1 ? "5' 6\"" : beat === 2 ? '=2*(w+h)' : String(value)

  return (
    <div className="viz viz--slider" data-beat={beat}>
      <div className="viz-field">
        <span className="viz-field__value">{text}</span>
        <span className="viz-field__unit">{beat === 2 ? '' : 'mm'}</span>
        <span className="viz-roller" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, i) => (
            <i key={i} style={{ ['--i' as string]: i }} />
          ))}
        </span>
      </div>
      <div className="viz-readout-big">
        {value.toLocaleString()}
        <small>mm</small>
      </div>
      <div className="viz-chips">
        <Chip on={beat === 0 && step > 2} label="scrubbing" />
        <Chip on={beat === 1} label="imperial" />
        <Chip on={beat === 2} label="expression" />
      </div>
    </div>
  )
}

/* ── AI providers ─────────────────────────────────────────────────────────── */

function NodesVisual({ beat, step }: V) {
  return (
    <div className="viz viz--nodes" data-beat={beat}>
      <div className="viz-nodes">
        {Array.from({ length: 12 }).map((_, i) => {
          const free = i < 5
          const active =
            beat === 0 ? (step / (STEPS - 1)) * 12 > i : beat === 1 && (i === 2 || i === 7)
          return (
            <span key={i} className={`viz-node${free ? ' is-free' : ''}${active ? ' is-on' : ''}`}>
              {free ? 'free' : 'paid'}
            </span>
          )
        })}
      </div>
      <div className="viz-chips">
        <Chip on={beat === 0 && step > 4} label="13 free" />
        <Chip on={beat === 1} label="failover →" />
      </div>
    </div>
  )
}

/* ── shared ───────────────────────────────────────────────────────────────── */

function Chip({ on, label }: { on: boolean; label: string }) {
  return <span className={`viz-chip${on ? ' is-on' : ''}`}>{label}</span>
}

function Hand() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
      <path
        d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11m0-1V4.5a1.5 1.5 0 0 1 3 0V11m0-.5V6.5a1.5 1.5 0 0 1 3 0V13c0 3.9-2.2 7-6 7-2.4 0-3.9-1-4.9-2.6L6 13.4c-.5-.9-.2-2 .7-2.4.7-.4 1.6-.2 2.1.5l.2.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
