import { useEffect, useRef } from 'react'
import { mmss } from '../lib/format.js'

export default function MissionTimeline({ items, tick, decisionTick, endTick }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth }, [items.length])
  const span = Math.max(endTick || decisionTick, tick, 1)
  return (
    <div className="tlw">
      <div className="track" title="Mission progress">
        <div className="fill" style={{ width: `${(tick / span) * 100}%` }} />
        <div className="mk" style={{ left: `${(decisionTick / span) * 100}%` }} title="Decision window opens" />
      </div>
      <div className="tl" ref={ref}>
        {items.length === 0 && <span className="t3">No events yet.</span>}
        {items.map((it) => (
          <div key={it.key} className={it.tone} title={it.detail}>
            <b>{it.clock}</b>{it.label}{it.detail ? <span className="d"> · {it.detail}</span> : null}
            <span className="t3"> · T+{mmss(it.tick)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
