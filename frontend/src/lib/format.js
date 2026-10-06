export const mmss = (s) => {
  const t = Math.max(0, Math.round(s))
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

export function clockAt(start, tick) {
  const [h, m, s] = start.split(':').map(Number)
  const t = h * 3600 + m * 60 + s + tick
  const p = (n) => String(n).padStart(2, '0')
  return `${p(Math.floor(t / 3600) % 24)}:${p(Math.floor(t / 60) % 60)}:${p(t % 60)}`
}

export const DELAYED_LATENCY_S = 10 // a report whose transit took at least this long is flagged DELAYED in the UI

export const GLOSSARY = {
  AGE: 'How long ago the reported observation was actually made.',
  TRUTH: 'What is actually happening inside the simulation. The trainee never sees this during the mission.',
  GAP: 'Important information that existed but did not reach the trainee.',
  JR: 'Judgment regret: expected-value difference between your action and the best action given the information you actually had.',
  IR: 'Information regret: value lost because information was missing, even if the decision was the best possible with what you had.',
  EVPI: 'Expected value of perfect information: how much an oracle revealing the true state would have been worth.',
  GAPCONF: 'Stated confidence minus the confidence the evidence supported. Positive means overconfident.',
}

export const FINDING_LABELS = {
  stale: 'Used stale information',
  conflict: 'Decided despite conflicting reports',
  no_info_action: 'Did not seek additional information',
  comm_aware: 'Recognized degraded communication',
  freshest: 'Identified the freshest report',
  ack_missed: 'Order acknowledgement not received',
  overconfident: 'Confidence exceeded model support',
}

export const freshTone = (f) => ({ FRESH: 'g', AGING: 'a', STALE: 'r' }[f] || '')
export const nice = (s = '') => String(s).replaceAll('_', ' ')
const arrow = (l) => (l || '').replace('-', ' → ')

// Turns a backend event into a short human label. `msg(id)` resolves a message id to {source, content}.
export function describeEvent(e, msg = () => null) {
  const p = e.payload || {}
  const m = p.id ? msg(p.id) : null
  const body = m ? m.content : ''
  switch (e.type) {
    case 'MISSION_STARTED': return { label: 'MISSION STARTED', detail: p.seed != null ? `seed ${p.seed}` : '', tone: 'bl' }
    case 'LINK_DEGRADED': return { label: 'LINK DEGRADED', detail: `${arrow(p.link)} · loss ${Math.round(p.packet_loss * 100)}% · latency ${p.latency}s`, tone: 'a' }
    case 'LINK_RECOVERED': return { label: 'LINK RECOVERED', detail: arrow(p.link), tone: 'g' }
    case 'WORLD_STATE_CHANGED': return { label: 'WORLD STATE CHANGED', detail: p.note, tone: 'r' }
    case 'ENTITY_OBSERVATION': return { label: `${e.source} OBSERVATION`, detail: p.note, tone: 'bl' }
    case 'MESSAGE_GENERATED': return { label: `${e.source} → ${e.target} REPORT SENT`, detail: p.content, tone: '' }
    case 'MESSAGE_QUEUED': return { label: 'REPORT QUEUED', detail: body || p.id, tone: '' }
    case 'MESSAGE_IN_TRANSIT': return { label: 'REPORT IN TRANSIT', detail: body || p.id, tone: '' }
    case 'MESSAGE_DELIVERED': return { label: e.target === 'HQ' ? `REPORT RECEIVED · ${e.source}` : `DELIVERED TO ${e.target}`, detail: body, tone: 'g' }
    case 'MESSAGE_LOST': return { label: `REPORT LOST · ${e.source}`, detail: body || p.id, tone: 'r' }
    case 'MESSAGE_EXPIRED': return { label: `REPORT EXPIRED · ${e.source}`, detail: body || p.id, tone: 'r' }
    case 'PROBE_STARTED': return { label: 'DECISION WINDOW OPEN', detail: '', tone: 'a' }
    case 'DECISION_MADE': return { label: 'DECISION MADE', detail: `${nice(p.action)} · confidence ${p.confidence}%`, tone: 'bl' }
    case 'ORDER_ISSUED': return { label: 'ORDER ISSUED', detail: nice(p.action), tone: 'bl' }
    case 'ORDER_QUEUED': return { label: 'ORDER QUEUED', detail: '', tone: '' }
    case 'ORDER_IN_TRANSIT': return { label: 'ORDER IN TRANSIT', detail: `${e.source} → ${e.target}`, tone: '' }
    case 'ORDER_DELIVERED': return { label: 'ORDER RECEIVED', detail: e.target, tone: 'g' }
    case 'ORDER_EXECUTING': return { label: 'ORDER EXECUTING', detail: e.source, tone: 'g' }
    case 'ACK_GENERATED': return { label: 'ACK GENERATED', detail: e.source, tone: '' }
    case 'ACK_IN_TRANSIT': return { label: 'ACK IN TRANSIT', detail: '', tone: '' }
    case 'ACK_RECEIVED': return { label: 'ACK RECEIVED', detail: '', tone: 'g' }
    case 'ACK_LOST': return { label: 'ACK NOT RECEIVED', detail: 'HQ never confirmed execution', tone: 'r' }
    case 'ASSET_MOVING': return { label: `${e.source} MOVING`, detail: p.route, tone: 'bl' }
    case 'ASSET_HALTED': return { label: `${e.source} HALTED`, detail: p.route, tone: 'r' }
    case 'ASSET_DELAYED': return { label: `${e.source} DELAYED`, detail: p.route, tone: 'r' }
    case 'ASSET_ARRIVED': return { label: `${e.source} ARRIVED`, detail: p.route, tone: 'g' }
    case 'ASSET_HOLDING': return { label: `${e.source} HOLDING`, detail: '', tone: 'a' }
    case 'INFORMATION_REFRESHED': return { label: 'INFORMATION REFRESHED', detail: '', tone: 'bl' }
    case 'MISSION_ENDED': return { label: 'MISSION ENDED', detail: p.outcome, tone: 'bl' }
    default: return { label: nice(e.type), detail: '', tone: '' }
  }
}

// Events worth showing in the live trainee timeline.
export const TIMELINE_TYPES = new Set([
  'MISSION_STARTED', 'LINK_DEGRADED', 'LINK_RECOVERED', 'MESSAGE_DELIVERED', 'PROBE_STARTED', 'DECISION_MADE',
  'ORDER_ISSUED', 'ORDER_QUEUED', 'ORDER_IN_TRANSIT', 'ORDER_DELIVERED', 'ORDER_EXECUTING', 'ACK_GENERATED',
  'ACK_IN_TRANSIT', 'ACK_RECEIVED', 'ACK_LOST', 'ASSET_MOVING', 'ASSET_HALTED', 'ASSET_DELAYED', 'ASSET_ARRIVED',
  'ASSET_HOLDING', 'INFORMATION_REFRESHED', 'MISSION_ENDED',
])
