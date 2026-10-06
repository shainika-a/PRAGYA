import { useState } from 'react'
import { Chip, Tip } from './UI.jsx'
import { DELAYED_LATENCY_S, freshTone, mmss } from '../lib/format.js'

const ar = (l) => l.replace('-', ' → ')

// Only reports that actually reached HQ. `links` is the live link state so we can flag degraded paths.
export default function InformationFeed({ reports, links, newIds = new Set(), compact = false }) {
  const [open, setOpen] = useState(null)
  if (!reports.length) {
    return <div className="blind">No reports have reached HQ yet. Anything still in transit, or lost on a degraded link, is invisible to you.</div>
  }
  return (
    <>
      {reports.map((r) => {
        const tone = freshTone(r.freshness)
        const degraded = links?.[r.link] && links[r.link].status !== 'GOOD'
        return (
          <div key={r.message_id} className={`msg ${tone === 'g' ? 'fresh' : tone === 'a' ? 'aging' : 'stale'}${newIds.has(r.message_id) ? ' new' : ''}`}
            onClick={() => setOpen(open === r.message_id ? null : r.message_id)}>
            <div className="mh">
              <b>{r.received_clock}</b><span>{r.source}</span>
              {r.priority === 'HIGH' && <Chip tone="a">HIGH</Chip>}
              <Chip tone={tone}>{r.freshness}</Chip>
            </div>
            <div className="mtx">{r.content}</div>
            <div className="mm">
              CONFIDENCE <b>{Math.round(r.confidence * 100)}%</b> · <Tip term="AGE">AGE</Tip> <b className={`age ${tone === 'g' ? 'fresh' : tone === 'a' ? 'aging' : 'stale'}`}>{mmss(r.age)}</b>
            </div>
            {!compact && (r.latency >= DELAYED_LATENCY_S || degraded || r.confidence < 0.6) && (
              <div className="row" style={{ marginTop: 5 }}>
                {r.latency >= DELAYED_LATENCY_S && <Chip tone="a">DELAYED {r.latency}s</Chip>}
                {degraded && <Chip tone="a">DEGRADED LINK</Chip>}
                {r.confidence < 0.6 && <Chip tone="r">LOW CONFIDENCE</Chip>}
              </div>
            )}
            {open === r.message_id && (
              <div className="mx">OBSERVED {r.observed_clock} · RECEIVED {r.received_clock} · LINK {ar(r.link)} · TRANSIT {r.latency}s · {mmss(r.age_since_receipt)} SINCE RECEIPT</div>
            )}
          </div>
        )
      })}
    </>
  )
}
