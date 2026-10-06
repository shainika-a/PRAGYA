import { mmss } from '../lib/format.js'

const PHASE = { OBSERVING: ['OBSERVING', 'g'], DECISION: ['AWAITING DECISION', 'a'], EXECUTING: ['ORDER EXECUTING', 'bl'], ENDED: ['COMPLETE', 'bl'] }

// Operational indicators derived only from trainee-visible state.
export default function StatusBar({ mission }) {
  const links = Object.values(mission.links)
  const bad = links.filter((l) => l.status !== 'GOOD').length
  const ages = mission.reports.map((r) => r.age)
  const stale = mission.reports.filter((r) => r.freshness === 'STALE').length
  const [phase, tone] = PHASE[mission.phase] || [mission.phase, '']
  const toDecision = mission.decision_tick - mission.tick
  return (
    <div className="status">
      <div><small>Mission state</small><b className={tone}>{phase}</b></div>
      <div><small>Mission time</small><b>T+{mmss(mission.tick)} · {mission.clock}</b></div>
      <div><small>Decision window</small><b className={toDecision > 0 ? '' : 'a'}>{toDecision > 0 ? `opens in ${mmss(toDecision)}` : mission.decision ? 'decision recorded' : 'OPEN'}</b></div>
      <div><small>Communications</small><b className={bad ? 'a' : 'g'}>{bad ? `${bad}/${links.length} LINKS DEGRADED` : 'ALL LINKS NOMINAL'}</b></div>
      <div><small>Information</small><b>{mission.reports.length} received{stale ? <span className="r"> · {stale} stale</span> : ''}</b></div>
      <div><small>Freshest report</small><b className={ages.length ? '' : 't3'}>{ages.length ? `${mmss(Math.min(...ages))} old` : 'none yet'}</b></div>
    </div>
  )
}
