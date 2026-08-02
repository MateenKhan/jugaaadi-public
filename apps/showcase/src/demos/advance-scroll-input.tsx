import { useCallback, useState } from 'react'
import {
  DimensionInput,
  Unit,
  evaluateExpression,
  fromMm,
  formatFromMm,
} from '@jugaaadi/advance-scroll-input'
import '@jugaaadi/advance-scroll-input/styles.css'
import './frame.css'
import { mount } from './mount'

const UNITS: Unit[] = [Unit.MM, Unit.CM, Unit.M, Unit.INCH, Unit.FEET]

function ScrollInputDemo() {
  // The component stores millimetres and displays whatever unit you hand it,
  // so the unit switch below is a pure display change — no data conversion.
  const [widthMm, setWidthMm] = useState(1800)
  const [heightMm, setHeightMm] = useState(750)
  const [unit, setUnit] = useState<Unit>(Unit.MM)
  const [expression, setExpression] = useState('2 * (1800 + 750)')

  const [log, setLog] = useState<string[]>([])
  const pushLog = useCallback((line: string) => {
    setLog((prev) => [line, ...prev].slice(0, 12))
  }, [])

  const areaM2 = ((widthMm / 1000) * (heightMm / 1000)).toFixed(3)

  // The expression engine is exported standalone — no React, no component.
  const evaluated = evaluateExpression(expression, {
    variables: { w: fromMm(widthMm, unit), h: fromMm(heightMm, unit) },
    displayUnit: unit,
  })

  return (
    <div className="demo">
      <p className="demo__hint">
        Drag the roller to scrub, or type a value with any unit — <code>1800</code>,{' '}
        <code>6ft</code>, <code>72"</code>, <code>5' 6"</code>, <code>1 1/2 in</code>. Start with{' '}
        <kbd>=</kbd> for a formula.
      </p>

      <div className="demo__body">
        <div className="panel panel--side" style={{ flex: '1 1 340px' }}>
          <p className="panel__label">Dimensions</p>

          <div className="field">
            <span className="field__label">Width</span>
            <DimensionInput valueMm={widthMm} onChangeMm={setWidthMm} unit={unit} />
          </div>

          <div className="field">
            <span className="field__label">Height</span>
            <DimensionInput
              valueMm={heightMm}
              onChangeMm={setHeightMm}
              unit={unit}
              onCommitMm={(mm, source) => pushLog(`height ${mm.toFixed(1)}mm (${source})`)}
            />
          </div>

          <div className="field">
            <span className="field__label">Display unit</span>
            <div className="unit-switch">
              {UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  aria-pressed={u === unit}
                  onClick={() => setUnit(u)}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="panel panel--side">
          <p className="panel__label">Canonical value</p>
          <dl className="readout">
            <dt>width</dt>
            <dd>{formatFromMm(widthMm, unit, 3)} {unit}</dd>
            <dt>height</dt>
            <dd>{formatFromMm(heightMm, unit, 3)} {unit}</dd>
            <dt>stored</dt>
            <dd>{widthMm.toFixed(1)} × {heightMm.toFixed(1)} mm</dd>
            <dt>area</dt>
            <dd>{areaM2} m²</dd>
          </dl>

          <p className="panel__label" style={{ marginTop: 20 }}>
            Expression engine
          </p>
          <div className="field">
            <input
              className="demo-input"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              spellCheck={false}
              aria-label="Expression"
              style={{
                width: '100%',
                padding: '7px 9px',
                borderRadius: 7,
                border: '1px solid var(--line)',
                background: '#0b0e14',
                color: 'var(--fg)',
                font: '12.5px var(--mono)',
              }}
            />
          </div>
          <dl className="readout">
            <dt>vars</dt>
            <dd>w, h</dd>
            <dt>result</dt>
            <dd>{evaluated.ok ? String(evaluated.value) : `⚠ ${evaluated.error}`}</dd>
          </dl>

          <p className="panel__label" style={{ marginTop: 20 }}>
            Commits
          </p>
          <ul className="log">
            {log.length === 0 ? (
              <li className="log__empty">nothing yet</li>
            ) : (
              log.map((line, i) => <li key={`${line}-${i}`}>{line}</li>)
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}

mount(<ScrollInputDemo />)
