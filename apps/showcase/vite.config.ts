import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

/**
 * Multi-page build, not a single SPA.
 *
 * The shell (`index.html`) owns the tab strip and mounts the selected library
 * in an <iframe> pointing at its own entry under `demos/`. That is a deliberate
 * choice, not ceremony:
 *
 *   1. CSS isolation. `@jugaaadi/table` ships a compiled Tailwind stylesheet
 *      that includes preflight AND `html, body, #root { overflow: hidden }`.
 *      Imported into a shared document it would reset the shell's typography
 *      and lock the page from scrolling. In its own document it is correct.
 *   2. Style collisions between siblings. Each library ships global CSS of its
 *      own; a frame per library means none of them can reach another.
 *   3. Cost. A tab's bundle is only fetched when that tab is first opened, so
 *      the landing page stays light no matter how many libraries get added.
 *
 * Adding a library = one entry here + one file in `src/demos` + one row in
 * `src/shell/catalog.ts`.
 */
const page = (name: string) =>
  fileURLToPath(new URL(`./demos/${name}.html`, import.meta.url))

/** A file inside the ai-providers submodule, as an absolute path. */
const aiProviders = (path: string) =>
  fileURLToPath(new URL(`../../packages/ai-providers/src/${path}`, import.meta.url))

export default defineConfig({
  plugins: [react()],

  // Served at the root of its own subdomain (public.jugaaadi.com), so '/'.
  base: '/',

  /**
   * ── The one exception to "install libraries from npm" ─────────────────────
   *
   * Every other tab installs its library from npm, so the showcase demos what
   * `npm install` actually gives you (see the README). `@jugaaadi/ai-providers`
   * is not published yet, and unlike `db-browser` it is worth a live demo now:
   * the whole point of the tab is a browsable registry of free providers and a
   * harness for testing your own keys, neither of which a static placeholder
   * can do.
   *
   * So this one library is compiled from the submodule's TypeScript. The
   * package ships no bundler config — `npm run build` there is plain `tsc` —
   * which is exactly why aliasing works: `src/**` is ordinary TS/TSX with
   * relative imports, and Vite compiles it like any other source in this app.
   * Its internal imports use the TS-ESM `./providers.js` form; Vite resolves
   * those back to `.ts` because the importer is TypeScript.
   *
   * Consequences, so they are not a surprise later:
   *   • The package's own dependencies (`ai`, the `@ai-sdk/*` adapters, `zod`)
   *     are NOT installed transitively — npm knows nothing about this link — so
   *     they are listed directly in this app's package.json.
   *   • The demo tracks the pinned submodule commit, not a release. Its tab is
   *     marked `source-linked` in catalog.ts and shows no `npm i` line, because
   *     there is nothing to install.
   *
   * Delete this block, drop the extra deps, and set the catalog row to
   * `published` the day the package lands on npm.
   *
   * Longest specifier first: Vite matches string aliases by prefix, so a bare
   * '@jugaaadi/ai-providers' entry would otherwise swallow the subpaths.
   */
  resolve: {
    alias: [
      { find: '@jugaaadi/ai-providers/react', replacement: aiProviders('react/index.ts') },
      { find: '@jugaaadi/ai-providers/ui', replacement: aiProviders('ui/index.ts') },
      { find: '@jugaaadi/ai-providers', replacement: aiProviders('index.ts') },
    ],
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        shell: fileURLToPath(new URL('./index.html', import.meta.url)),
        table: page('table'),
        'folder-tree': page('folder-tree'),
        joystick: page('joystick'),
        'advance-scroll-input': page('advance-scroll-input'),
        'db-browser': page('db-browser'),
        'ai-providers': page('ai-providers'),
      },
    },
  },

  server: {
    port: 5180,
  },
})
