/**
 * Dummy content for the motion prototype.
 *
 * Deliberately NOT the real libraries — this page exists to judge the layout
 * and the motion language before any of it is wired to a live component. The
 * beat text mirrors what the real reels would say, so the pacing is realistic.
 */

export type Beat = {
  /** Short label — appears in the rail as a sub-item and on the callout. */
  label: string
  /** The line that animates in, word by word, when the beat becomes active. */
  headline: string
  /** Supporting sentence, faded in just behind the headline. */
  body: string
  /** Fake readout rows, so the side panel has the shape it will really have. */
  readout?: [string, string][]
}

export type Module = {
  slug: string
  name: string
  /** One-glyph mark for the icons-only rail state. */
  glyph: string
  tagline: string
  install: string
  /** Drives the placeholder visual — each shape reacts to beat progress. */
  visual: 'ring' | 'grid' | 'tree' | 'slider' | 'nodes'
  /**
   * How this module shows scroll progress.
   *
   * A ring only makes sense around something ROUND. Wrapped around a
   * spreadsheet or a file tree it fights the content — a grid is rectangular
   * and the circle just crops it awkwardly — so those modules get a linear
   * tick strip instead, which is the same instrument idiom laid out flat.
   */
  progress: 'ring' | 'bar'
  beats: Beat[]
}

export const MODULES: Module[] = [
  {
    slug: 'joystick',
    name: 'Joystick',
    glyph: '◎',
    tagline: 'Touch-first analogue stick',
    install: 'npm i @jugaaadi/joystick',
    visual: 'ring',
    // Round content, round progress.
    progress: 'ring',
    beats: [
      {
        label: 'Drag',
        headline: 'Drag past the ring.',
        body: 'Precise near the centre, and it keeps accelerating at the edge.',
        readout: [
          ['x', '0.0'],
          ['y', '-4.2'],
          ['deflect', '0.82'],
        ],
      },
      {
        label: 'Operations',
        headline: 'Switch the operation.',
        body: 'Move, rotate, scale — the stick emits the same vector, you decide what it means.',
        readout: [
          ['op', 'rotate'],
          ['angle', '45°'],
          ['snap', '15°'],
        ],
      },
      {
        label: 'Z axis',
        headline: 'Toggle the third axis.',
        body: 'Z as a toggle rather than a third stick, because thumbs only have two dimensions.',
        readout: [
          ['z', 'enabled'],
          ['axes', 'x · y · z'],
        ],
      },
      {
        label: 'Headless',
        headline: 'Or take just the maths.',
        body: 'A headless hook and the pure functions ship alongside the component.',
        readout: [
          ['exports', 'useJoystick'],
          ['deps', '0'],
        ],
      },
    ],
  },
  {
    slug: 'table',
    name: 'Table',
    glyph: '▦',
    tagline: 'Spreadsheet-grade data grid',
    install: 'npm i @jugaaadi/table',
    visual: 'grid',
    // A ring around a spreadsheet crops the grid and fights it. Flat strip.
    progress: 'bar',
    beats: [
      {
        label: 'Fill series',
        headline: 'It finishes your pattern.',
        body: 'Drag two cells and it infers the step — 2, 4, 6 becomes 8, 10, 12.',
        readout: [
          ['inferred', 'linear +2'],
          ['filled', '6 cells'],
        ],
      },
      {
        label: 'Formulas',
        headline: 'Point at a cell to name it.',
        body: 'Type = and the arrow keys pick references, exactly like the app you already know.',
        readout: [
          ['draft', '=C4+C3'],
          ['result', '42'],
        ],
      },
      {
        label: 'Right-click',
        headline: 'Everything where you expect it.',
        body: 'Insert, delete and clear, ordered by what you actually have selected.',
        readout: [
          ['selection', '3 rows'],
          ['actions', '6'],
        ],
      },
    ],
  },
  {
    slug: 'folder-tree',
    name: 'Folder Tree',
    glyph: '⌂',
    tagline: 'Drag-and-drop tree view',
    install: 'npm i @jugaaadi/folder-tree',
    visual: 'tree',
    progress: 'bar',
    beats: [
      {
        label: 'Reorder',
        headline: 'Drag anything anywhere.',
        body: 'Re-parent or reorder, with the illegal drops refused for you.',
        readout: [
          ['moved', 'chair-a'],
          ['into', 'Furniture'],
        ],
      },
      {
        label: 'Search',
        headline: 'Search opens the branches.',
        body: 'Matches auto-expand, so you never hunt through collapsed folders.',
        readout: [
          ['query', 'lamp'],
          ['hits', '2'],
        ],
      },
      {
        label: 'Keyboard',
        headline: 'Never touch the mouse.',
        body: 'Full arrow-key navigation, range select and rename.',
        readout: [['focus', 'Floor lamp']],
      },
    ],
  },
  {
    slug: 'scroll-input',
    name: 'Scroll Input',
    glyph: '⇕',
    tagline: 'Unit-aware number input',
    install: 'npm i @jugaaadi/advance-scroll-input',
    visual: 'slider',
    progress: 'bar',
    beats: [
      {
        label: 'Scrub',
        headline: 'Roll it to the value.',
        body: 'A vertical scrubber that stays precise at any magnitude.',
        readout: [
          ['value', '1800 mm'],
          ['unit', 'mm'],
        ],
      },
      {
        label: 'Units',
        headline: "Type 5' 6\" if you like.",
        body: 'Feet, inches, fractions, millimetres — it parses what you meant.',
        readout: [
          ['typed', "5' 6\""],
          ['stored', '1676.4 mm'],
        ],
      },
      {
        label: 'Formulas',
        headline: 'Start with = for maths.',
        body: 'A whole expression engine, usable standalone without React.',
        readout: [
          ['expr', '=2*(w+h)'],
          ['result', '5100'],
        ],
      },
    ],
  },
  {
    slug: 'ai-providers',
    name: 'AI Providers',
    glyph: '◈',
    tagline: 'BYOK multi-provider layer',
    install: 'npm i @jugaaadi/ai-providers',
    visual: 'nodes',
    progress: 'ring',
    beats: [
      {
        label: 'Registry',
        headline: 'Thirty-five providers, one list.',
        body: 'Free tiers marked, default models included, keys never leaving the browser.',
        readout: [
          ['free tier', '13'],
          ['credits', '13'],
        ],
      },
      {
        label: 'Failover',
        headline: 'Run out? Move on.',
        body: 'When a tier is exhausted it switches to the next provider automatically.',
        readout: [
          ['from', 'groq'],
          ['to', 'cerebras'],
        ],
      },
    ],
  },
]

/** Flattened beat list — the reel scrubs through this one continuous sequence. */
export type FlatBeat = Beat & {
  module: Module
  moduleIndex: number
  beatIndex: number
}

export const FLAT_BEATS: FlatBeat[] = MODULES.flatMap((module, moduleIndex) =>
  module.beats.map((beat, beatIndex) => ({
    ...beat,
    module,
    moduleIndex,
    beatIndex,
  })),
)
