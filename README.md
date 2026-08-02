# jugaaadi-public

The home of every open-source **@jugaaadi** npm package. One clone gets you all
of them, plus a tabbed showcase site — one tab per library — deployed at
**[public.jugaaadi.com](https://public.jugaaadi.com)**.

Each library keeps its own repo, its own releases and its own docs site. This
repo is the parent: it pins them as submodules and gives them a shared front
door.

## The libraries

| Library | Package | Status | Source | Docs |
| --- | --- | --- | --- | --- |
| Table | `@jugaaadi/table` | `0.0.1` | [MateenKhan/table](https://github.com/MateenKhan/table) | [table.jugaaadi.com](https://table.jugaaadi.com) |
| Folder Tree | `@jugaaadi/folder-tree` | `0.0.1` | [MateenKhan/folder-tree](https://github.com/MateenKhan/folder-tree) | [folder-tree.jugaaadi.com](https://folder-tree.jugaaadi.com) |
| Joystick | `@jugaaadi/joystick` | `0.0.1` | [MateenKhan/joystick](https://github.com/MateenKhan/joystick) | [joystick.jugaaadi.com](https://joystick.jugaaadi.com) |
| Scroll Input | `@jugaaadi/advance-scroll-input` | `0.0.2` | [MateenKhan/advance-scroll-input](https://github.com/MateenKhan/advance-scroll-input) | [scroll-input.jugaaadi.com](https://scroll-input.jugaaadi.com) |
| DB Browser | `@jugaaadi/db-browser` | source only | [MateenKhan/db-browser](https://github.com/MateenKhan/db-browser) | — |
| AI Providers | `@jugaaadi/ai-providers` | built from source | [MateenKhan/ai-providers](https://github.com/MateenKhan/ai-providers) | — |

Everything is MIT.

## Getting started

The libraries are git submodules, so clone recursively:

```bash
git clone --recurse-submodules https://github.com/MateenKhan/jugaaadi-public.git
cd jugaaadi-public
npm install
npm run dev
```

Already cloned without `--recurse-submodules`? Run `npm run sync`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Showcase dev server on <http://localhost:5180> |
| `npm run build` | Static production build into `apps/showcase/dist` |
| `npm run preview` | Serve that build locally |
| `npm run typecheck` | Typecheck the showcase |
| `npm run sync` | Init/update submodules at their pinned commits |
| `npm run sync:latest` | Move every submodule to the tip of its default branch |
| `npm run deploy` | Build and rsync to the VPS (see [Deploying](#deploying)) |

## Layout

```
jugaaadi-public/
├── packages/                 # git submodules — each library's own repo
│   ├── table/
│   ├── folder-tree/
│   ├── joystick/
│   ├── advance-scroll-input/
│   ├── db-browser/
│   └── ai-providers/
├── apps/showcase/            # the tabbed site
│   ├── index.html            #   the shell (tab strip + detail panel)
│   ├── demos/*.html          #   one document per library
│   └── src/
│       ├── shell/catalog.ts  #   ← the list of libraries
│       └── demos/*.tsx       #   one demo per library
└── deploy/                   # nginx config + rsync script
```

### Why the demos run in iframes

The shell mounts each library's demo in an `<iframe>` pointing at its own
document rather than rendering everything into one page. That is load-bearing:

- **CSS isolation.** `@jugaaadi/table` ships a compiled Tailwind stylesheet that
  includes preflight and sets `html, body, #root { overflow: hidden }` — the
  grid is designed to own its document. Dropped into a shared page it resets the
  shell's typography and stops the page scrolling. In its own document it is
  correct.
- **No sibling collisions.** Every library ships global CSS; a document per
  library means none of them can reach another.
- **Cost.** A library's bundle is only fetched when its tab is first opened. The
  shell itself is ~6 kB, and the 660 kB table bundle never loads for someone who
  only came to look at the joystick.

### Submodules vs npm

The showcase installs each library **from npm**, not from `packages/`. So the
site builds even when the submodules are missing, stale or mid-refactor, and it
always demos what a user actually gets from `npm install`.

The submodules are there so one clone gives you every library's source, and so
this repo records exactly which commit of each library was current.

To demo unreleased local changes instead, build the library and point npm at it:

```bash
npm --prefix packages/joystick install
npm --prefix packages/joystick run build
npm install ./packages/joystick -w @jugaaadi/showcase   # undo with `npm install`
```

### Three tab states, not two

A tab used to be one of two things: on npm with a live demo, or not on npm and
therefore a placeholder. `@jugaaadi/ai-providers` is neither — it has no npm
release, but its whole point is a browsable registry and a key-testing harness,
which a placeholder cannot be. So `catalog.ts` carries a `status` with three
values instead of a `published` boolean:

| `status` | Demo | Install line | Example |
| --- | --- | --- | --- |
| `published` | live, from npm | yes, with a version | Table, Joystick |
| `source-linked` | live, from `packages/<slug>/src` | no — nothing to install | AI Providers |
| `source-only` | placeholder pointing at the repo | no | DB Browser |

`hasLiveDemo()` decides what the stage renders; `isOnNpm()` decides whether an
`npm i` line would be honest. Setting `published: true` for an unreleased
package would have meant printing a version and an install command that do not
exist, so the third state exists to avoid lying in the UI.

### The `source-linked` exception

Exactly one library breaks the install-from-npm rule, and only until it ships.
`apps/showcase/vite.config.ts` aliases `@jugaaadi/ai-providers` (and its `/ui`
and `/react` subpaths) straight at `packages/ai-providers/src`, with a matching
`paths` entry in `apps/showcase/tsconfig.json` so `tsc` resolves it too.

That works because the package has no bundler config of its own — its build is
plain `tsc` over ordinary `.ts`/`.tsx` with relative imports, so Vite compiles
it exactly like showcase source. Its internal imports use the TypeScript-ESM
`./providers.js` form; Vite maps those back to `.ts` because the importer is
TypeScript.

Two consequences worth knowing before you touch it:

- **Its dependencies are not installed for you.** npm knows nothing about a Vite
  alias, so the package's `ai` peer, its fourteen `@ai-sdk/*` adapters and `zod`
  are listed directly in `apps/showcase/package.json`. All fourteen are
  required, not optional: the package's `client.ts` names each adapter in a
  literal `import()`, and Rollup resolves every one of those at build time, so a
  missing adapter fails the whole build rather than just its provider.
- **TypeScript is pinned to `~5.6`.** TS 5.7 made typed arrays generic, and the
  submodule's `vault.ts` passes a `Uint8Array<ArrayBufferLike>` where the newer
  `lib.dom.d.ts` wants `ArrayBufferView<ArrayBuffer>`. Because the source is
  compiled here rather than consumed as a prebuilt `.d.ts`, that error lands in
  `npm run typecheck`. The pin is the smallest honest fix while the link exists;
  it goes away with the alias.

To undo all of it once the package is on npm: delete the `resolve.alias` block
and the `paths` entry, drop the extra dependencies, unpin `typescript`, add
`@jugaaadi/ai-providers` as a normal dependency, and set the catalog row to
`status: 'published'` with a version.

### The AI Providers tab and CORS

That tab is BYOK: you paste your own key, it is encrypted into the package's
vault (a non-extractable WebCrypto key, IndexedDB, this origin only) and the
only request that ever carries it goes straight to the provider's own API. The
site is static files behind nginx, so there is nowhere else for a key to go.

The catch is CORS. Roughly a quarter of the registry refuses browser-origin
requests, and from JavaScript that failure is a bare `TypeError: Failed to
fetch` — no status, no body, indistinguishable from a dead network. Rather than
offer a test button that mysteriously fails, every provider carries a measured
verdict in `apps/showcase/src/demos/ai-providers.cors.ts`: 23 of the 32
single-key providers can be called directly, 8 cannot and say **needs a server
proxy** on the card. Of the 13 free tiers, 9 work in a browser; Cerebras,
NVIDIA NIM, GitHub Models and Cloudflare Workers AI do not.

Those values were measured, not read off documentation — a fake key POSTed to
each real endpoint, then re-checked with `curl` from the deployed origin looking
for `access-control-allow-origin` on the *response* rather than the preflight
(OpenAI, Cerebras, Scaleway and the Vercel AI Gateway all pass the preflight and
then strip the header). CORS policies change without notice; re-run the sweep
before trusting the table, and update the date in that file.

## Adding a library

1. `git submodule add https://github.com/MateenKhan/<name>.git packages/<name>`
2. Add it to `apps/showcase/package.json` dependencies (once it's on npm).
3. Add a row to `apps/showcase/src/shell/catalog.ts`.
4. Create `apps/showcase/demos/<name>.html` and `apps/showcase/src/demos/<name>.tsx`.
5. Register the entry in `apps/showcase/vite.config.ts`.

An unpublished library still gets a tab — set `status: 'source-only'` and it
shows a repo panel instead of a live demo, like `db-browser` does today. If it
needs a live demo before it ships, use `status: 'source-linked'` and alias it at
its submodule source; see [The `source-linked` exception](#the-source-linked-exception).

## Updating a library

Work in the library's own repo (or in `packages/<name>/`, which is that repo),
push there, publish to npm, then bump the pointer here:

```bash
npm run sync:latest
git add packages && git commit -m "chore: bump submodules"
```

If you bumped a published version, update it in `apps/showcase/package.json` and
`catalog.ts` too.

## Deploying

The build is plain static files served by nginx from a folder on the VPS,
alongside the other projects there.

```bash
cp deploy/.env.example deploy/.env    # once — set VPS_HOST / VPS_USER / VPS_PATH
npm run deploy                        # builds, then rsyncs dist/ to the server
```

One-time server setup:

```bash
sudo mkdir -p /var/www/public.jugaaadi.com
sudo cp deploy/nginx/public.jugaaadi.com.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/public.jugaaadi.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d public.jugaaadi.com
```

Point an `A` record for `public.jugaaadi.com` at the VPS before running certbot.

## License

MIT © Mateen Khan
