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

export default defineConfig({
  plugins: [react()],

  // Served at the root of its own subdomain (public.jugaaadi.com), so '/'.
  base: '/',

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
      },
    },
  },

  server: {
    port: 5180,
  },
})
