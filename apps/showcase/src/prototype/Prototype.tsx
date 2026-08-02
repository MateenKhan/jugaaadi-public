import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { animate, stagger, createTimeline } from 'animejs'
import { MODULES, FLAT_BEATS } from './modules'
import { useReel, scrollToBeat, INTRO } from './useReel'
import Visual from './Visuals'
import Dial from './Dial'
import Notes from './Notes'

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
  // Beat indices where a new module begins — the points the handoff plays at.
  const boundaries = useMemo(
    () =>
      FLAT_BEATS.reduce<number[]>((acc, b, i) => {
        if (i > 0 && b.moduleIndex !== FLAT_BEATS[i - 1].moduleIndex) acc.push(i)
        return acc
      }, []),
    [],
  )
  const { beat, step, started } = useReel(beatCount, boundaries)
  // Icons by default. The demo is what people came for, and an expanded rail
  // spends 264px of the widest screens on navigation nobody has asked for yet;
  // the » control opens it the moment they want to go somewhere.
  const [railMode, setRailMode] = useState<RailMode>('icons')
  const [railOpen, setRailOpen] = useState(false) // small screens

  const current = FLAT_BEATS[beat] ?? FLAT_BEATS[0]
  const module = current.module
  const dialRef = useRef<HTMLDivElement>(null)

  /**
   * The dial assembles itself on load, slowly, from the outside in.
   *
   * Arriving fully-formed gives the reader nothing to watch during the moment
   * they are orienting — and it is the reference's first two seconds: the ring
   * draws in before anything else happens. Deliberately unhurried; the whole
   * sequence is over two seconds, which is slow for a UI animation and right
   * for an establishing shot.
   *
   * Runs once. It is an entrance, not a beat transition.
   */
  useEffect(() => {
    const host = dialRef.current
    if (!host || REDUCED) return
    if (document.visibilityState !== 'visible') return

    const q = (sel: string) => host.querySelectorAll(sel)
    const tl = createTimeline({ defaults: { ease: 'out(3)' } })

    tl.add(q('.dial__disc'), { opacity: [0, 1], scale: [0.82, 1], duration: 1100 })
      .add(
        q('.dial__arc'),
        { opacity: [0, 1], scale: [0.9, 1], duration: 900, delay: stagger(110) },
        '-=800',
      )
      .add(q('.dial__ticks'), { opacity: [0, 1], scale: [0.94, 1], duration: 1000 }, '-=700')
      .add(q('.dial__inner i'), { opacity: [0, 1], duration: 800, delay: stagger(150) }, '-=650')
      .add(q('.dial__dome'), { opacity: [0, 1], duration: 900 }, '-=600')
      .add(q('.dial__module'), { opacity: [0, 1], scale: [0.94, 1], duration: 800 }, '-=750')

    return () => {
      tl.pause()
    }
  }, [])

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

      {/* ── the fixed, full-screen stage ────────────────────────────────── */}
      <div
        className={`stage${reelDone ? ' is-done' : ''}`}
        data-progress={module.progress}
        aria-hidden={reelDone}
      >
        {/* The module sits dead centre with the scroll dial drawn AROUND it, so
            the progress reads as belonging to the thing you are looking at
            rather than as a widget parked in a corner. */}
        {/* No decoration inside the circle. The real component sits dead centre
            — a joystick, a grid, a tree — and anything animating behind it is
            competing with the thing people came to look at. Idle movement lives
            on the ring chrome instead, where it cannot collide. */}
        <div className={`dial dial--${module.progress}`} ref={dialRef}>
          <Dial
            module={module}
            beat={beat}
            beatCount={beatCount}
            onJump={(b) => scrollToBeat(b, beatCount)}
          />

          <div className="dial__module">
            <Visual module={module} beat={current.beatIndex} step={step} />
            {/* Callouts live inside the module box so their coordinates are
                percentages of the thing they point at, and their leader lines
                run out past it into the margins. */}
            <Notes notes={current.notes ?? []} beat={beat} />
          </div>
        </div>

        {/* Everything else floats over the screen and is positioned against the
            viewport, not against the module — that is what keeps the stage
            feeling full-bleed instead of like a boxed panel with a sidebar. */}
        {/* The whole left column is ONE block — headline, prose, three bullets —
            vertically centred, because that is what gives the composition its
            balance. Splitting it across corners is what made the earlier
            version feel like scattered widgets rather than a designed page. */}
        <div className="hud" style={{ ['--hue' as string]: module.accent }}>
          <div className="hud__left">
            <Callout beat={beat} />
          </div>

          {/* Install belongs with the other reference material, not floating
              over the top-left corner competing with the headline. */}
          <div className="hud__right">
            <InstallLine pkg={module.install} />
            {current.code && (
              <pre className="code">
                <code>{current.code}</code>
              </pre>
            )}
          </div>
        </div>

        <div className={`stage__hint${started ? ' is-gone' : ''}`}>
          <span>scroll</span>
          <i />
        </div>
      </div>

      {/* The scroll runway the fixed stage reads: one screen per beat, plus the
          still intro screen before the first one starts moving. */}
      <div
        className="runway"
        style={{ height: `${(beatCount + INTRO) * 100}vh` }}
        aria-hidden="true"
      />

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

function InstallLine({ pkg }: { pkg: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 1400)
    return () => window.clearTimeout(t)
  }, [copied])

  return (
    <button
      type="button"
      className="install"
      onClick={() => {
        navigator.clipboard?.writeText(pkg).then(() => setCopied(true), () => undefined)
      }}
      title="Copy"
    >
      <code>{pkg}</code>
      <small>{copied ? 'copied' : 'copy'}</small>
    </button>
  )
}

/**
 * The headline animates in word by word on every beat change. Words rather than
 * characters: at this size a per-character stagger reads as noise, and words
 * land closer to how the sentence is actually read.
 */
function Callout({ beat }: { beat: number }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const data = FLAT_BEATS[beat] ?? FLAT_BEATS[0]

  useLayoutEffect(() => {
    if (REDUCED) return
    // Never start a reveal while the document is hidden. anime.js writes the
    // `from` state (opacity 0) immediately and then advances on rAF — which a
    // background tab suspends — so the copy would be set invisible and left
    // that way indefinitely. An entrance nobody can see is not worth playing,
    // and leaving the text visible is the safe failure.
    if (document.visibilityState !== 'visible') return
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
    // Body and bullets follow the headline in one staggered wave, so the block
    // arrives as a paragraph rather than four separate fades.
    const rest = ref.current?.parentElement?.querySelectorAll(
      '.callout__body, .callout__rule, .bullets li',
    )
    if (rest?.length) {
      animate(rest, {
        opacity: [0, 1],
        y: [12, 0],
        duration: 520,
        delay: stagger(70, { start: 200 }),
        ease: 'out(2)',
      })
    }
  }, [beat])

  return (
    <div className="callout">
      <span className="callout__eyebrow">{data.module.name}</span>
      <h2 className="callout__title" ref={ref} key={`h-${beat}`}>
        {data.headline.split(' ').map((w, i) => (
          <span className="word" key={`${w}-${i}`}>
            <span>{w}</span>
          </span>
        ))}
      </h2>
      <p className="callout__body" key={`b-${beat}`}>
        {data.body}
      </p>

      <span className="callout__rule" />

      <ul className="bullets" key={`u-${beat}`}>
        {data.bullets.map((b) => (
          <li key={b}>
            <i aria-hidden="true">→</i>
            {b}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* The readout table and the Usage/Props/Events accordion used to live here.
   Both are gone: they filled the right-hand third with material nobody reads
   during a demo reel, and that space is exactly what the composition needed.
   Reference material belongs on the library's own docs page. */

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
