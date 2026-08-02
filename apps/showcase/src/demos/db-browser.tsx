import './frame.css'
import { mount } from './mount'

/**
 * `@jugaaadi/db-browser` has no npm release yet, so there is nothing to install
 * and nothing to demo here. The shell shows its own placeholder rather than
 * loading this document — this entry exists so the page builds, and so the live
 * demo is a one-file change the moment the package ships.
 *
 * To bring it online: publish the package, add it to the showcase's
 * dependencies, flip `published: true` (and set `version`) in
 * `src/shell/catalog.ts`, then replace the body below with a real <DbBrowser />
 * wired to a connector.
 */
function DbBrowserPending() {
  return (
    <div className="demo">
      <div className="panel" style={{ margin: 'auto', maxWidth: 520 }}>
        <p className="panel__label">@jugaaadi/db-browser</p>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--fg-muted)' }}>
          Not published to npm yet. The source lives in this repo under{' '}
          <code>packages/db-browser</code>, which ships its own runnable demo app with Postgres and
          SQLite connectors.
        </p>
      </div>
    </div>
  )
}

mount(<DbBrowserPending />)
