import { useCallback, useState } from 'react'
import { Joystick, type JoystickDelta, type JoystickGestureSummary } from '@jugaaadi/joystick'
import '@jugaaadi/joystick/styles.css'
import './frame.css'
import { mount } from './mount'

/**
 * The stick emits per-frame deltas, so the honest demo is to integrate them
 * into a position the way a real consumer would, and show the running total
 * next to the raw frame values.
 */
function JoystickDemo() {
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 })
  const [frame, setFrame] = useState<JoystickDelta | null>(null)
  const [log, setLog] = useState<string[]>([])

  // onChange fires every animation frame during a drag; appending to state
  // per frame would be wasteful, so only completed gestures reach the log.
  const pushLog = useCallback((line: string) => {
    setLog((prev) => [line, ...prev].slice(0, 12))
  }, [])

  const onChange = useCallback((delta: JoystickDelta) => {
    setFrame(delta)
    setPosition((prev) => ({
      x: prev.x + delta.x,
      y: prev.y + delta.y,
      z: prev.z + delta.z,
    }))
  }, [])

  const onEnd = useCallback(
    (summary: JoystickGestureSummary) => {
      setFrame(null)
      const { total, operation, durationMs, dominantAxis, cancelled } = summary
      pushLog(
        cancelled
          ? `${operation} cancelled`
          : `${operation} Δ(${fmt(total.x)}, ${fmt(total.y)}, ${fmt(total.z)}) ` +
              `${dominantAxis ?? '—'} ${Math.round(durationMs)}ms`,
      )
    },
    [pushLog],
  )

  return (
    <div className="demo">
      <p className="demo__hint">
        Drag the stick — past the ring it keeps accelerating. Tap an axis arrow to nudge by one
        unit, or focus it and use the arrow keys (<kbd>Shift</kbd> for ×10, <kbd>Esc</kbd> to
        cancel a drag).
      </p>

      <div className="demo__body">
        <div className="panel panel--stage">
          <Joystick
            operations={['move', 'rotate', 'scale']}
            axes={['x', 'y', 'z']}
            size={168}
            label="Transform"
            onStart={() => pushLog('gesture start')}
            onChange={onChange}
            onEnd={onEnd}
            onAxisTap={(axis, direction) => pushLog(`tap ${axis}${direction > 0 ? '+' : '−'}`)}
          />
        </div>

        <div className="panel panel--side">
          <p className="panel__label">Integrated position</p>
          <dl className="readout">
            <dt>x</dt>
            <dd>{fmt(position.x)}</dd>
            <dt>y</dt>
            <dd>{fmt(position.y)}</dd>
            <dt>z</dt>
            <dd>{fmt(position.z)}</dd>
            <dt>frame</dt>
            <dd>
              {frame
                ? `${fmt(frame.x)}, ${fmt(frame.y)}, ${fmt(frame.z)}`
                : '—'}
            </dd>
            <dt>deflect</dt>
            <dd>{frame ? frame.magnitude.toFixed(2) : '—'}</dd>
          </dl>

          <p className="panel__label" style={{ marginTop: 20 }}>
            Gestures
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

function fmt(n: number) {
  return n.toFixed(1)
}

mount(<JoystickDemo />)
