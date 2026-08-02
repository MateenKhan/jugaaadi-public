/**
 * Every public @jugaaadi library, in tab order.
 *
 * This is the one place a library is described. The tab strip, the detail
 * panel, the install snippet and the iframe target all read from here — adding
 * a library means adding a row, creating `src/demos/<slug>.tsx`, its
 * `demos/<slug>.html` entry, and listing that entry in `vite.config.ts`.
 */

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
  /**
   * `false` while a package is source-only. An unpublished library still gets a
   * tab (the source is right there in `packages/`), but the tab shows the repo
   * instead of a live demo, because there is nothing on npm to install yet.
   */
  published: boolean
  /** Version currently pinned by the showcase. Absent while unpublished. */
  version?: string
}

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
    published: true,
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
    published: true,
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
    published: true,
    version: '0.0.1',
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
    published: true,
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
    published: false,
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
