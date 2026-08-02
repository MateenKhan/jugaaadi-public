/**
 * Dummy content for the motion prototype.
 *
 * Deliberately NOT the real libraries — this page exists to settle the layout
 * and the motion language before any of it is wired to a live component.
 *
 * The content SHAPE is the important part and it is copied from what works:
 * a coloured headline, two or three lines of prose, and exactly three bullets.
 * Nothing else. Restraint is doing most of the work in the reference — every
 * extra panel steals space from the thing people actually came to look at.
 */

export type Note = {
  text: string
  /** Anchor point on the visual, in % of the module box. */
  x: number
  y: number
  /** Which margin the label sits in. */
  side: 'left' | 'right'
  /** Vertical position of the label, in % — lets labels stack cleanly. */
  labelY: number
}

export type Beat = {
  /** Short label — appears in the rail as a sub-item. */
  label: string
  /** The line that animates in, word by word, when the beat becomes active. */
  headline: string
  /** Two or three lines. Longer than that and the eye leaves. */
  body: string
  /** Exactly three, short. A fourth always wants a fifth. */
  bullets: [string, string, string]
  /** The code this beat is really about, for the corner panel. */
  code?: string
  /** Leader-line callouts pointing at parts of the visual. */
  notes?: Note[]
}

export type Module = {
  slug: string
  name: string
  /** One-glyph mark for the icons-only rail state. */
  glyph: string
  tagline: string
  install: string
  /** Drives the placeholder visual. */
  visual: 'ring' | 'grid' | 'tree' | 'slider' | 'nodes'
  /**
   * How this module shows scroll progress. A ring only makes sense around
   * something round; wrapped on a spreadsheet it crops the grid and fights the
   * shape, so those get a flat tick strip — the same idiom laid out straight.
   */
  progress: 'ring' | 'bar'
  /**
   * Signature colour. Tints the headline, the bullet arrows and the callout
   * dots, so each section arrives with its own identity — which is what stops
   * fifteen beats reading as one long grey page.
   */
  accent: string
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
    progress: 'ring',
    accent: '#ff5a36',
    beats: [
      {
        label: 'Drag',
        headline: 'Drag past the ring.',
        body: 'Precise near the centre, and it keeps accelerating at the edge.',
        bullets: ['Acceleration curve', 'Pointer and touch', 'Zero dependencies'],
        code: `<Joystick\n  onChange={(d) => move(d.x, d.y)}\n/>`,
        notes: [
          { text: 'thumb', x: 50, y: 62, side: 'left', labelY: 34 },
          { text: 'travel ring', x: 80, y: 28, side: 'right', labelY: 16 },
          { text: 'dead zone', x: 50, y: 50, side: 'left', labelY: 66 },
        ],
      },
      {
        label: 'Operations',
        headline: 'Switch the operation.',
        body: 'Move, rotate, scale — the stick emits one vector and you decide what it means.',
        bullets: ['Five operations', 'Controlled or not', 'Snap to angle'],
        code: `operations={['move','rotate','scale']}`,
        notes: [
          { text: 'operation', x: 74, y: 34, side: 'right', labelY: 22 },
          { text: 'snapped 15°', x: 56, y: 70, side: 'right', labelY: 76 },
        ],
      },
      {
        label: 'Z axis',
        headline: 'Toggle the third axis.',
        body: 'Z as a toggle rather than a third stick, because thumbs only have two dimensions.',
        bullets: ['Toggle or axis', 'Keyboard nudge', 'Per-axis limits'],
        code: `axes={['x','y','z']}\nzToggle`,
        notes: [{ text: 'z enabled', x: 68, y: 62, side: 'right', labelY: 58 }],
      },
      {
        label: 'Headless',
        headline: 'Or take just the maths.',
        body: 'A headless hook and the pure functions ship alongside the component.',
        bullets: ['useJoystick()', 'Pure engine exports', 'Build your own shell'],
        code: `const { bind, state } = useJoystick()`,
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
    progress: 'bar',
    accent: '#3ddad7',
    beats: [
      {
        label: 'Fill series',
        headline: 'It finishes your pattern.',
        body: 'Drag two cells and it infers the step — 2, 4, 6 becomes 8, 10, 12.',
        bullets: ['Linear and dates', 'Weekdays and months', 'Ctrl to copy instead'],
        code: `inferSeries([2, 4, 6])\n// → +2`,
        // All on the right: the copy column owns the left third, and on the
        // wide flat modules a left-hand leader runs straight under the headline.
        notes: [
          { text: 'source cells', x: 36, y: 20, side: 'right', labelY: 10 },
          { text: 'inferred step', x: 36, y: 64, side: 'right', labelY: 44 },
          { text: 'fill handle', x: 46, y: 82, side: 'right', labelY: 78 },
        ],
      },
      {
        label: 'Formulas',
        headline: 'Point at a cell to name it.',
        body: 'Type = and the arrow keys pick references, exactly like the app you already know.',
        bullets: ['A1 and named refs', 'F4 cycles $', 'Marching ants'],
        code: `=C4+C3`,
        notes: [
          { text: 'reference', x: 40, y: 40, side: 'right', labelY: 24 },
          { text: 'live result', x: 62, y: 58, side: 'right', labelY: 62 },
        ],
      },
      {
        label: 'Right-click',
        headline: 'Everything where you expect it.',
        body: 'Insert, delete and clear, ordered by what you actually have selected.',
        bullets: ['Context menus', 'Selection-aware order', 'Nothing buried'],
        code: `onContextMenu → scope.kind`,
        notes: [
          { text: 'selection', x: 28, y: 46, side: 'right', labelY: 26 },
          { text: 'row actions first', x: 64, y: 46, side: 'right', labelY: 64 },
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
    accent: '#a78bfa',
    beats: [
      {
        label: 'Reorder',
        headline: 'Drag anything anywhere.',
        body: 'Re-parent or reorder, with the illegal drops refused for you.',
        bullets: ['moveNodes() helper', 'Guarded drops', 'Multi-node drag'],
        code: `onMove={(ids, target, pos) =>\n  setNodes(moveNodes(...))}`,
        notes: [
          { text: 'dragged row', x: 40, y: 56, side: 'right', labelY: 62 },
          { text: 'drop target', x: 40, y: 34, side: 'right', labelY: 24 },
        ],
      },
      {
        label: 'Search',
        headline: 'Search opens the branches.',
        body: 'Matches auto-expand, so you never hunt through collapsed folders.',
        bullets: ['Auto-expand hits', 'Hidden keywords', 'Highlighted matches'],
        code: `searchTree(nodes, 'lamp')`,
      },
      {
        label: 'Keyboard',
        headline: 'Never touch the mouse.',
        body: 'Full arrow-key navigation, range select and rename.',
        bullets: ['Roving focus', 'Shift range select', 'F2 to rename'],
        code: `ariaLabel="Scene outliner"`,
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
    accent: '#facc15',
    beats: [
      {
        label: 'Scrub',
        headline: 'Roll it to the value.',
        body: 'A vertical scrubber that stays precise at any magnitude.',
        bullets: ['Pointer and touch', 'Precision near zero', 'Keyboard steps'],
        code: `<DimensionInput valueMm={1800} />`,
        notes: [{ text: 'roller', x: 84, y: 42, side: 'right', labelY: 34 }],
      },
      {
        label: 'Units',
        headline: "Type 5' 6\" if you like.",
        body: 'Feet, inches, fractions, millimetres — it parses what you meant.',
        bullets: ['Seven units', 'Fractions and feet', 'Stored in mm'],
        code: `parseDimensionToMm("5' 6\\"")\n// → 1676.4`,
      },
      {
        label: 'Formulas',
        headline: 'Start with = for maths.',
        body: 'A whole expression engine, usable standalone without React.',
        bullets: ['Variables', 'Built-in functions', 'No React needed'],
        code: `evaluateExpression('=2*(w+h)')`,
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
    accent: '#4ade80',
    beats: [
      {
        label: 'Registry',
        headline: 'Thirty-five providers, one list.',
        body: 'Free tiers marked, default models included, keys never leaving the browser.',
        bullets: ['13 free tiers', 'Encrypted vault', 'One client'],
        code: `import { PROVIDERS } from '@jugaaadi/ai-providers'`,
        notes: [
          { text: 'free tier', x: 22, y: 30, side: 'left', labelY: 22 },
          { text: 'paid', x: 74, y: 30, side: 'right', labelY: 18 },
        ],
      },
      {
        label: 'Failover',
        headline: 'Run out? Move on.',
        body: 'When a tier is exhausted it switches to the next provider automatically.',
        bullets: ['Automatic failover', 'Ordered preference', 'Per-provider keys'],
        code: `withFailover(['groq','cerebras'])`,
        notes: [{ text: 'switched', x: 56, y: 46, side: 'right', labelY: 52 }],
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
