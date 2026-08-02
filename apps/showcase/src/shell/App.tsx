import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LIBRARIES,
  findLibrary,
  hasLiveDemo,
  isOnNpm,
  slugFromHash,
  type Library,
} from './catalog'

const REPO_URL = 'https://github.com/MateenKhan/jugaaadi-public'

/**
 * The tab shell. It owns which library is active and nothing else — each demo
 * runs in its own document (see vite.config.ts for why), so the shell never
 * imports a library or its CSS.
 */
export default function App() {
  const [slug, setSlug] = useState(() => slugFromHash(window.location.hash))

  // The hash is the source of truth, so a tab is linkable and survives reload.
  useEffect(() => {
    const onHashChange = () => setSlug(slugFromHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Normalise a bare or bogus hash so the address bar always shows the real tab.
  useEffect(() => {
    const target = `#/${slug}`
    if (window.location.hash !== target) {
      window.history.replaceState(null, '', target)
    }
  }, [slug])

  const active = findLibrary(slug)

  useEffect(() => {
    document.title = `${active.name} — jugaaadi`
  }, [active.name])

  return (
    <div className="shell">
      <Masthead />
      <TabStrip slug={slug} onSelect={setSlug} />
      <Detail library={active} />
      <Stage library={active} />
    </div>
  )
}

function Masthead() {
  return (
    <header className="masthead">
      <a className="brand" href="#/">
        <span className="brand__mark">
          jugaaadi<span>.</span>
        </span>
        <span className="brand__tag">open-source React libraries</span>
      </a>
      <div className="masthead__spacer" />
      <nav className="masthead__links">
        <a className="ghost-link" href="https://www.npmjs.com/org/jugaaadi" target="_blank" rel="noreferrer">
          npm
        </a>
        <a className="ghost-link" href={REPO_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
      </nav>
    </header>
  )
}

function TabStrip({ slug, onSelect }: { slug: string; onSelect: (slug: string) => void }) {
  const stripRef = useRef<HTMLDivElement>(null)

  /**
   * Roving arrow-key navigation, per the WAI-ARIA tabs pattern — the tab strip
   * is one tab stop and Left/Right move between tabs.
   */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
      if (delta === 0) return
      event.preventDefault()

      const index = LIBRARIES.findIndex((l) => l.slug === slug)
      const next = LIBRARIES[(index + delta + LIBRARIES.length) % LIBRARIES.length]
      onSelect(next.slug)

      // Move focus with the selection so the keyboard user stays oriented.
      stripRef.current
        ?.querySelector<HTMLButtonElement>(`[data-slug="${next.slug}"]`)
        ?.focus()
    },
    [slug, onSelect],
  )

  return (
    <div className="tabs" role="tablist" aria-label="Libraries" ref={stripRef} onKeyDown={onKeyDown}>
      {LIBRARIES.map((library) => {
        const selected = library.slug === slug
        return (
          <button
            key={library.slug}
            type="button"
            role="tab"
            data-slug={library.slug}
            className="tab"
            aria-selected={selected}
            // Only the selected tab is reachable by Tab; arrows do the rest.
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(library.slug)}
          >
            {library.name}
            {!isOnNpm(library) && <span className="tab__dot" aria-label="not yet published" />}
          </button>
        )
      })}
    </div>
  )
}

function Detail({ library }: { library: Library }) {
  return (
    <section className="detail">
      <div className="detail__text">
        <h1 className="detail__title">
          {library.name}
          <StatusBadge library={library} />
        </h1>
        <p className="detail__blurb">{library.blurb}</p>
      </div>

      <div className="detail__side">
        {isOnNpm(library) && <InstallLine pkg={library.pkg} />}
        <div className="detail__links">
          <a className="ghost-link" href={library.repo} target="_blank" rel="noreferrer">
            Source
          </a>
          {library.docs && (
            <a className="ghost-link" href={library.docs} target="_blank" rel="noreferrer">
              Docs
            </a>
          )}
          {isOnNpm(library) && (
            <a
              className="ghost-link"
              href={`https://www.npmjs.com/package/${library.pkg}`}
              target="_blank"
              rel="noreferrer"
            >
              npm
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * One badge per status. `source-linked` says "built from source" rather than
 * showing a version, because there is no released version to show — the demo is
 * whatever commit the submodule is pinned at.
 */
function StatusBadge({ library }: { library: Library }) {
  if (library.status === 'published') return <span className="badge">v{library.version}</span>
  if (library.status === 'source-linked') {
    return (
      <span className="badge badge--soon" title="Demo built from the submodule source, not from npm">
        built from source
      </span>
    )
  }
  return <span className="badge badge--soon">source only</span>
}

function InstallLine({ pkg }: { pkg: string }) {
  const [copied, setCopied] = useState(false)
  const command = `npm i ${pkg}`

  const copy = useCallback(() => {
    // `writeText` rejects on an insecure origin or a denied permission; the
    // command is still visible, so a failure just means no confirmation.
    navigator.clipboard?.writeText(command).then(
      () => setCopied(true),
      () => undefined,
    )
  }, [command])

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1400)
    return () => window.clearTimeout(timer)
  }, [copied])

  return (
    <div className="install">
      <code>{command}</code>
      <button type="button" className="install__copy" onClick={copy}>
        {copied ? 'copied' : 'copy'}
      </button>
    </div>
  )
}

function Stage({ library }: { library: Library }) {
  if (!hasLiveDemo(library)) {
    return (
      <main className="stage">
        <div className="placeholder">
          <h2 className="placeholder__title">Not on npm yet</h2>
          <p className="placeholder__body">
            <code>{library.pkg}</code> hasn&apos;t been published, so there is nothing to install
            for a live demo here. The full source is in this repo as a submodule under{' '}
            <code>packages/{library.slug}</code>, and the project ships its own runnable demo app.
          </p>
          <div className="placeholder__actions">
            <a className="ghost-link" href={library.repo} target="_blank" rel="noreferrer">
              Browse the source
            </a>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="stage">
      {/*
        `key` forces a fresh document when the tab changes rather than reusing
        the frame, so a demo always starts from a clean state — and so the
        previous library's globals are torn down with its document.
      */}
      <iframe
        key={library.slug}
        className="stage__frame"
        src={`${import.meta.env.BASE_URL}demos/${library.slug}.html`}
        title={`${library.name} demo`}
      />
    </main>
  )
}
