import { useCallback, useMemo, useState } from 'react'
import { Joystick } from '@jugaaadi/joystick'
import '@jugaaadi/joystick/styles.css'
import { FolderTree, moveNodes, type TreeNode, type TreeNodeId } from '@jugaaadi/folder-tree'
import '@jugaaadi/folder-tree/styles.css'
import { DimensionInput, Unit } from '@jugaaadi/advance-scroll-input'
import '@jugaaadi/advance-scroll-input/styles.css'
import { PROVIDERS } from '@jugaaadi/ai-providers'
import type { Module } from './modules'

/**
 * The real components, on the stage.
 *
 * Four of the five render inline. `@jugaaadi/table` does not and cannot: its
 * stylesheet is a compiled Tailwind bundle including preflight AND
 * `html, body, #root { overflow: hidden }`, so importing it here would reset
 * this page's typography and stop it scrolling — which for a scroll-driven reel
 * is fatal. It gets its own document behind an iframe instead, exactly as the
 * main showcase does.
 *
 * These are not screenshots or mock-ups. The joystick really drags, the tree
 * really re-parents, the input really parses feet and inches, and the provider
 * list is the actual registry.
 */

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
      return <JoystickVisual beat={beat} />
    case 'grid':
      return <TableVisual />
    case 'tree':
      return <TreeVisual beat={beat} />
    case 'slider':
      return <SliderVisual beat={beat} step={step} />
    default:
      return <ProvidersVisual beat={beat} step={step} />
  }
}

/* ── joystick ─────────────────────────────────────────────────────────────── */

function JoystickVisual({ beat }: { beat: number }) {
  const [pos, setPos] = useState({ x: 0, y: 0, z: 0 })

  return (
    <div className="live live--joystick">
      <Joystick
        // Each beat foregrounds a different part of the real API rather than
        // pretending: beat 1 adds the operation switcher, beat 2 the Z toggle.
        operations={beat >= 1 ? ['move', 'rotate', 'scale'] : ['move']}
        axes={beat >= 2 ? ['x', 'y', 'z'] : ['x', 'y']}
        zToggle={beat >= 2}
        size={190}
        collapsible={false}
        label="Transform"
        onChange={(d) =>
          setPos((p) => ({ x: p.x + d.x, y: p.y + d.y, z: p.z + d.z }))
        }
      />
      <dl className="live__readout">
        <div>
          <dt>x</dt>
          <dd>{pos.x.toFixed(1)}</dd>
        </div>
        <div>
          <dt>y</dt>
          <dd>{pos.y.toFixed(1)}</dd>
        </div>
        <div>
          <dt>z</dt>
          <dd>{pos.z.toFixed(1)}</dd>
        </div>
      </dl>
    </div>
  )
}

/* ── table (iframe — see the note at the top) ─────────────────────────────── */

function TableVisual() {
  return (
    <div className="live live--table">
      <iframe
        src={`${import.meta.env.BASE_URL}demos/table.html`}
        title="@jugaaadi/table"
        loading="lazy"
      />
    </div>
  )
}

/* ── folder tree ──────────────────────────────────────────────────────────── */

const TREE: TreeNode[] = [
  {
    id: 'scene',
    label: 'Scene',
    children: [
      {
        id: 'furniture',
        label: 'Furniture',
        children: [
          { id: 'table', label: 'Dining table', hint: '1.8 m' },
          { id: 'chair-a', label: 'Chair A', hint: '0.9 m' },
          { id: 'chair-b', label: 'Chair B', hint: '0.9 m' },
        ],
      },
      {
        id: 'lights',
        label: 'Lighting',
        children: [
          { id: 'lamp', label: 'Floor lamp', hint: '1.4 m' },
          { id: 'pendant', label: 'Pendant', hint: 'opal' },
        ],
      },
    ],
  },
]

function TreeVisual({ beat }: { beat: number }) {
  const [nodes, setNodes] = useState<TreeNode[]>(TREE)
  const [selected, setSelected] = useState<TreeNodeId[]>(['chair-a'])
  const [search, setSearch] = useState('')

  const onMove = useCallback(
    (moved: TreeNodeId[], target: TreeNodeId, position: 'before' | 'inside' | 'after') => {
      setNodes((prev) => moveNodes(prev, moved, target, position))
    },
    [],
  )

  return (
    <div className="live live--tree">
      <FolderTree
        nodes={nodes}
        selectedIds={selected}
        onSelect={setSelected}
        // Beat 1 is the search beat, so the field only appears there.
        showSearch={beat === 1}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search the scene…"
        defaultExpandedIds={['scene', 'furniture', 'lights']}
        onMove={onMove}
        ariaLabel="Scene outliner"
      />
    </div>
  )
}

/* ── scroll input ─────────────────────────────────────────────────────────── */

function SliderVisual({ beat, step }: { beat: number; step: number }) {
  const [mm, setMm] = useState(1800)
  const unit = beat === 1 ? Unit.FEET : Unit.MM

  return (
    <div className="live live--slider">
      <label className="live__label">Width</label>
      <DimensionInput valueMm={mm} onChangeMm={setMm} unit={unit} />
      <div className="live__big">
        {Math.round(mm).toLocaleString()}
        <small>mm</small>
      </div>
      <p className="live__hint">
        {beat === 0 && 'Drag the roller, or type a value.'}
        {beat === 1 && `Try 5' 6" — it parses what you meant.`}
        {beat === 2 && 'Start with = for a formula.'}
      </p>
      {/* `step` keeps the hint in sync with the beat's own progress. */}
      <span className="live__pulse" data-on={step > 3} />
    </div>
  )
}

/* ── ai providers ─────────────────────────────────────────────────────────── */

function ProvidersVisual({ beat, step }: { beat: number; step: number }) {
  // The real registry, not a mock — free tiers first, which is the point.
  const list = useMemo(() => {
    const free = PROVIDERS.filter((p) => p.freeTier === 'free')
    const credits = PROVIDERS.filter((p) => p.freeTier === 'credits')
    return [...free, ...credits].slice(0, 18)
  }, [])

  const lit = beat === 0 ? Math.round(((step + 1) / 8) * list.length) : list.length

  return (
    <div className="live live--providers">
      <div className="live__grid">
        {list.map((p, i) => (
          <span
            key={p.key}
            className={`live__chip${i < lit ? ' is-on' : ''}${
              p.freeTier === 'free' ? ' is-free' : ''
            }`}
            title={p.freeNote ?? p.name}
          >
            {p.name}
          </span>
        ))}
      </div>
      <p className="live__hint">
        {PROVIDERS.filter((p) => p.freeTier === 'free').length} with an ongoing free tier ·{' '}
        {PROVIDERS.length} total
      </p>
    </div>
  )
}
