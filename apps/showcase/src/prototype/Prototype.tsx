import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { MODULES, FLAT_BEATS } from './modules'
import { useReel, scrollToBeat } from './useReel'
import Visual from './Visuals'

/**
 * Motion prototype — layout and animation language only, dummy content.
 *
 * The stage is FIXED and the page scrolls a tall spacer behind it. That is what
 * makes the scrubbing smooth: nothing re-lays-out as you scroll, the stage just
 * reads a number and re-renders its contents. It also means scroll never has to
 * be intercepted, so the wheel, the scrollbar, keyboard PageDown and a touch
 * flick all drive the reel identically and for free.
 */

type RailMode = 'expanded' | 'icons'

const REDUCED =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Prototype() {
  const beatCount = FLAT_BEATS.length
  const { beat, step, started } = useReel(beatCount)
  const [railMode, setRailMode] = useState<RailMode>('expanded')
  const [railOpen, setRailOpen] = useState(false) // small screens
  const [docsOpen, setDocsOpen] = useState<string | null>(null)

  const current = FLAT_BEATS[beat] ?? FLAT_BEATS[0]
  const module = current.module

  // The reel occupies the first stretch of the page; the about section lives in
  // normal flow after it, so the stage steps aside once the beats are done.
  const reelDone = beat === beatCount - 1 && step === 7

  return (
    <div className={`proto${railMode === 'icons' ? ' proto--icons' : ''}`}>
      <Rail
        mode={railMode}
        open={railOpen}
        activeModule={current.moduleIndex}
        activeBeat={beat}
        beatCount={beatCount}
        onToggleMode={() => setRailMode((m) => (m === 'expanded' ? 'icons' : 'expanded'))}
        onClose={() => setRailOpen(false)}
      />

      <button
        type="button"
        className="proto-burger"
        aria-label="Open navigation"
        aria-expanded={railOpen}
        onClick={() => setRailOpen((v) => !v)}
      >
        <span /><span /><span />
      </button>

      {/* ── the fixed stage ─────────────────────────────────────────────── */}
      <div className={`stage${reelDone ? ' is-done' : ''}`} aria-hidden={reelDone}>
        <div className="stage__output">
          <Visual module={module} beat={current.beatIndex} step={step} />
        </div>

        <aside className="stage__aside">
          <ModuleHead module={module} />
          <Callout beat={beat} />
          <Readout rows={current.readout ?? []} />
          <Docs
            module={module}
            open={docsOpen}
            onToggle={(id) => setDocsOpen((cur) => (cur === id ? null : id))}
          />
        </aside>

        <ProgressRing
          beat={beat}
          step={step}
          beatCount={beatCount}
          onStep={(d) => scrollToBeat(Math.min(beatCount - 1, Math.max(0, beat + d)), beatCount)}
        />

        <div className={`stage__hint${started ? ' is-gone' : ''}`}>
          <span>scroll</span>
          <i />
        </div>
      </div>

      {/* The scroll runway the fixed stage reads. One slot per beat. */}
      <div className="runway" style={{ height: `${beatCount * 100}vh` }} aria-hidden="true" />

      <About />
    </div>
  )
}

/* ── rail ─────────────────────────────────────────────────────────────────── */

function Rail({
  mode,
  open,
  activeModule,
  activeBeat,
  beatCount,
  onToggleMode,
  onClose,
}: {
  mode: RailMode
  open: boolean
  activeModule: number
  activeBeat: number
  beatCount: number
  onToggleMode: () => void
  onClose: () => void
}) {
  // Running offset so a module can map its local beat to a global index.
  const offsets = useMemo(() => {
    let n = 0
    return MODULES.map((m) => {
      const start = n
      n += m.beats.length
      return start
    })
  }, [])

  return (
    <nav className={`rail${open ? ' is-open' : ''}`} aria-label="Libraries">
      <div className="rail__head">
        <span className="rail__mark">
          jugaaadi<i>.</i>
        </span>
        <button
          type="button"
          className="rail__collapse"
          onClick={onToggleMode}
          aria-label={mode === 'expanded' ? 'Collapse to icons' : 'Expand navigation'}
          title={mode === 'expanded' ? 'Collapse to icons' : 'Expand navigation'}
        >
          {mode === 'expanded' ? '«' : '»'}
        </button>
      </div>

      <ul className="rail__list">
        {MODULES.map((m, i) => {
          const active = i === activeModule
          return (
            <li key={m.slug} className={`rail__item${active ? ' is-active' : ''}`}>
              <button
                type="button"
                className="rail__link"
                onClick={() => {
                  scrollToBeat(offsets[i], beatCount)
                  onClose()
                }}
              >
                <span className="rail__glyph">{m.glyph}</span>
                <span className="rail__label">
                  <b>{m.name}</b>
                  <small>{m.tagline}</small>
                </span>
              </button>

              {/* Sub-menu: the module's beats, as jump targets. */}
              <ul className="rail__sub">
                {m.beats.map((b, j) => {
                  const global = offsets[i] + j
                  return (
                    <li key={b.label}>
                      <button
                        type="button"
                        className={`rail__subLink${global === activeBeat ? ' is-active' : ''}`}
                        onClick={() => {
                          scrollToBeat(global, beatCount)
                          onClose()
                        }}
                      >
                        <i />
                        {b.label}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </li>
          )
        })}
      </ul>

      <div className="rail__foot">
        <a href="https://github.com/MateenKhan/jugaaadi-public" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </div>
    </nav>
  )
}

/* ── aside ────────────────────────────────────────────────────────────────── */

function ModuleHead({ module }: { module: (typeof MODULES)[number] }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 1400)
    return () => window.clearTimeout(t)
  }, [copied])

  return (
    <div className="head">
      <span className="head__eyebrow">{module.glyph} {module.name}</span>
      <button
        type="button"
        className="head__install"
        onClick={() => {
          navigator.clipboard?.writeText(module.install).then(() => setCopied(true), () => undefined)
        }}
        title="Copy"
      >
        <code>{module.install}</code>
        <small>{copied ? 'copied' : 'copy'}</small>
      </button>
    </div>
  )
}

/**
 * The headline animates in word by word on every beat change. Words rather than
 * characters: at this size a per-character stagger reads as noise, and words
 * land closer to how the sentence is actually read.
 */
function Callout({ beat }: { beat: number }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const bodyRef = useRef<HTMLParagraphElement>(null)
  const data = FLAT_BEATS[beat] ?? FLAT_BEATS[0]

  useLayoutEffect(() => {
    if (REDUCED) return
    const words = ref.current?.querySelectorAll('.word > span')
    if (words?.length) {
      animate(words, {
        opacity: [0, 1],
        y: [18, 0],
        filter: ['blur(8px)', 'blur(0px)'],
        duration: 620,
        delay: stagger(42),
        ease: 'out(3)',
      })
    }
    if (bodyRef.current) {
      animate(bodyRef.current, {
        opacity: [0, 1],
        y: [10, 0],
        duration: 520,
        delay: 180,
        ease: 'out(2)',
      })
    }
  }, [beat])

  return (
    <div className="callout">
      <h2 className="callout__title" ref={ref} key={`h-${beat}`}>
        {data.headline.split(' ').map((w, i) => (
          <span className="word" key={`${w}-${i}`}>
            <span>{w}</span>
          </span>
        ))}
      </h2>
      <p className="callout__body" ref={bodyRef} key={`b-${beat}`}>
        {data.body}
      </p>
    </div>
  )
}

function Readout({ rows }: { rows: [string, string][] }) {
  if (!rows.length) return null
  return (
    <dl className="readout">
      {rows.map(([k, v]) => (
        <div className="readout__row" key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Docs stay shut by default — the output is what people came for. */
function Docs({
  module,
  open,
  onToggle,
}: {
  module: (typeof MODULES)[number]
  open: string | null
  onToggle: (id: string) => void
}) {
  const panels = [
    { id: 'usage', title: 'Usage', body: `import { ${module.name.replace(/\s/g, '')} } from '${module.install.replace('npm i ', '')}'` },
    { id: 'props', title: 'Props', body: 'Every option is typed, with sensible defaults. Full table in the docs.' },
    { id: 'events', title: 'Events', body: 'onStart, onChange, onEnd — plus a headless hook if you want the maths only.' },
  ]
  return (
    <div className="docs">
      {panels.map((p) => (
        <div className={`docs__item${open === p.id ? ' is-open' : ''}`} key={p.id}>
          <button type="button" className="docs__trigger" onClick={() => onToggle(p.id)}>
            {p.title}
            <i aria-hidden="true">{open === p.id ? '−' : '+'}</i>
          </button>
          <div className="docs__panel">
            <p>{p.body}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── progress ring ────────────────────────────────────────────────────────── */

function ProgressRing({
  beat,
  step,
  beatCount,
  onStep,
}: {
  beat: number
  step: number
  beatCount: number
  onStep: (delta: number) => void
}) {
  const R = 26
  const C = 2 * Math.PI * R
  // The sweep itself is driven by `--p` in CSS so it stays smooth between
  // renders; this is only for assistive tech, which does not need 60fps.
  const approx = Math.round(((beat + step / 8) / beatCount) * 100)

  return (
    <div className="ring">
      <button type="button" className="ring__nav" onClick={() => onStep(-1)} aria-label="Previous">
        ↑
      </button>
      <div
        className="ring__dial"
        role="progressbar"
        aria-valuenow={approx}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{ ['--c' as string]: `${C.toFixed(2)}px` }}
      >
        <svg viewBox="0 0 64 64" width="64" height="64">
          <circle cx="32" cy="32" r={R} className="ring__track" />
          <circle cx="32" cy="32" r={R} className="ring__value" />
        </svg>
        <span className="ring__count">
          {beat + 1}
          <i>/{beatCount}</i>
        </span>
      </div>
      <button type="button" className="ring__nav" onClick={() => onStep(1)} aria-label="Next">
        ↓
      </button>
    </div>
  )
}

/* ── about ────────────────────────────────────────────────────────────────── */

function About() {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useRef(false)

  const reveal = useCallback(() => {
    if (seen.current || REDUCED || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    if (rect.top > window.innerHeight * 0.8) return
    seen.current = true
    animate(ref.current.querySelectorAll('[data-reveal]'), {
      opacity: [0, 1],
      y: [26, 0],
      duration: 700,
      delay: stagger(90),
      ease: 'out(3)',
    })
  }, [])

  useEffect(() => {
    reveal()
    window.addEventListener('scroll', reveal, { passive: true })
    return () => window.removeEventListener('scroll', reveal)
  }, [reveal])

  return (
    <section className="about" ref={ref}>
      <div className="about__inner">
        <p className="about__eyebrow" data-reveal>
          the author
        </p>
        <h2 className="about__title" data-reveal>
          Built by one developer, in the open.
        </h2>
        <p className="about__body" data-reveal>
          Every library here is MIT, dependency-light and built to be read as much as
          used. If any of it saved you an afternoon, you can support the next one.
        </p>
        <div className="about__actions" data-reveal>
          <a className="btn btn--primary" href="#">
            Support the work
          </a>
          <a className="btn" href="https://github.com/MateenKhan" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </div>
    </section>
  )
}
