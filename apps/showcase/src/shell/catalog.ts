/**
 * Every public @jugaaadi library, in tab order.
 *
 * This is the one place a library is described. The tab strip, the detail
 * panel, the install snippet and the iframe target all read from here — adding
 * a library means adding a row, creating `src/demos/<slug>.tsx`, its
 * `demos/<slug>.html` entry, and listing that entry in `vite.config.ts`.
 */

/**
 * How this library's demo is sourced — which is a different question from
 * whether it is on npm, and conflating the two was the original mistake here.
 *
 * This started as a boolean `published`, where `false` meant both "not on npm"
 * and "no live demo". `@jugaaadi/ai-providers` broke that: it is unpublished
 * AND has a demo, built against `packages/ai-providers/src` through a Vite
 * alias. Flipping it to `published: true` would have meant inventing a version
 * and an `npm i` line that does not work — the tab would be lying. So the flag
 * became three states, and the two questions are now asked separately:
 * `hasLiveDemo()` decides what the stage renders, `status === 'published'`
 * decides whether an install line is honest.
 */
export type LibraryStatus =
  /** On npm. The showcase installs it from there and demos what users get. */
  | 'published'
  /**
   * Not on npm yet, but the demo compiles the submodule's TypeScript directly
   * (see the alias in `vite.config.ts`). Live demo, no install line.
   */
  | 'source-linked'
  /** Not on npm and no demo wired up. The tab shows the repo instead. */
  | 'source-only'

export type Library = {
  /** URL slug, demo entry filename, and submodule directory name — all the same. */
  slug: string
  /** Display name in the tab strip. */
  name: string
  /** Published npm package name. */
  pkg: string
  /** One line, shown under the title. */
  tagline: string
  /** Longer description for the detail panel. */
  blurb: string
  /** GitHub repo — also the submodule under `packages/`. */
  repo: string
  /** Dedicated docs site, where one exists. */
  docs?: string
  /** Where the demo comes from. See LibraryStatus. */
  status: LibraryStatus
  /** Version currently pinned by the showcase. Only ever set when published. */
  version?: string
}

/** Does this tab mount a real `demos/<slug>.html`, or just point at the repo? */
export const hasLiveDemo = (library: Library): boolean => library.status !== 'source-only'

/** Is there something on npm to `npm i`? Gates the install snippet and the npm link. */
export const isOnNpm = (library: Library): boolean => library.status === 'published'

export const LIBRARIES: Library[] = [
  {
    slug: 'table',
    name: 'Table',
    pkg: '@jugaaadi/table',
    tagline: 'Spreadsheet-style data grid for React',
    blurb:
      'Editable cells, formulas, rich column types, borders and formatting, find & replace, shareable views, and a build-your-own blank sheet. Built on TanStack Table v8.',
    repo: 'https://github.com/MateenKhan/table',
    docs: 'https://table.jugaaadi.com',
    status: 'published',
    version: '0.0.1',
  },
  {
    slug: 'folder-tree',
    name: 'Folder Tree',
    pkg: '@jugaaadi/folder-tree',
    tagline: 'Dark-first tree view with drag-and-drop',
    blurb:
      'A dependency-free React tree: drag-and-drop reordering, search that auto-expands to its hits, multi and range select, and full keyboard navigation.',
    repo: 'https://github.com/MateenKhan/folder-tree',
    docs: 'https://folder-tree.jugaaadi.com',
    status: 'published',
    version: '0.0.1',
  },
  {
    slug: 'joystick',
    name: 'Joystick',
    pkg: '@jugaaadi/joystick',
    tagline: 'Touch-first analogue stick',
    blurb:
      'Drag past the ring and it keeps accelerating — precise near the centre, fast at the edge. Ships a headless hook and the pure maths alongside the component. Zero runtime dependencies.',
    repo: 'https://github.com/MateenKhan/joystick',
    docs: 'https://joystick.jugaaadi.com',
    status: 'published',
    version: '0.0.2',
  },
  {
    slug: 'advance-scroll-input',
    name: 'Scroll Input',
    pkg: '@jugaaadi/advance-scroll-input',
    tagline: 'Unit-aware number input with a roller scrubber',
    blurb:
      "A touch-friendly number input with a vertical roller scrubber and unit-aware parsing — 10ft, 100in, 123mm, 123\", 5' 6\" — plus a formula engine that works standalone.",
    repo: 'https://github.com/MateenKhan/advance-scroll-input',
    docs: 'https://scroll-input.jugaaadi.com',
    status: 'published',
    version: '0.0.2',
  },
  {
    slug: 'db-browser',
    name: 'DB Browser',
    pkg: '@jugaaadi/db-browser',
    tagline: 'Transport-agnostic database browser',
    blurb:
      'Table browsing with paginated CRUD, a guarded SQL console and live schema introspection, built on @jugaaadi/table. Ships with Postgres and SQLite connectors.',
    repo: 'https://github.com/MateenKhan/db-browser',
    status: 'source-only',
  },
  {
    slug: 'ai-providers',
    name: 'AI Providers',
    pkg: '@jugaaadi/ai-providers',
    tagline: 'BYOK multi-provider AI layer',
    blurb:
      'One registry of 35 AI providers with their free tiers and default models, an encrypted browser key vault, and a thin Vercel AI SDK client. This tab lists every provider and lets you test your own keys — they never leave your browser.',
    repo: 'https://github.com/MateenKhan/ai-providers',
    status: 'source-linked',
  },
]

export const DEFAULT_SLUG = LIBRARIES[0].slug

export function findLibrary(slug: string | undefined): Library {
  return LIBRARIES.find((l) => l.slug === slug) ?? LIBRARIES[0]
}

/** `#/joystick` → `joystick`. Anything unrecognised falls back to the first tab. */
export function slugFromHash(hash: string): string {
  const raw = hash.replace(/^#\/?/, '').trim()
  return LIBRARIES.some((l) => l.slug === raw) ? raw : DEFAULT_SLUG
}
