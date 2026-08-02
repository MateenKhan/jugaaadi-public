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
│   └── db-browser/
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

## Adding a library

1. `git submodule add https://github.com/MateenKhan/<name>.git packages/<name>`
2. Add it to `apps/showcase/package.json` dependencies (once it's on npm).
3. Add a row to `apps/showcase/src/shell/catalog.ts`.
4. Create `apps/showcase/demos/<name>.html` and `apps/showcase/src/demos/<name>.tsx`.
5. Register the entry in `apps/showcase/vite.config.ts`.

An unpublished library still gets a tab — set `published: false` and it shows a
source-only panel instead of a live demo, like `db-browser` does today.

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
