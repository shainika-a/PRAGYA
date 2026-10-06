import { useState } from 'react'
import { KV } from './UI.jsx'
import { clockAt, nice } from '../lib/format.js'

const STAGES = [['ORDER_ISSUED', 'Issued'], ['ORDER_QUEUED', 'Queued'], ['ORDER_IN_TRANSIT', 'In transit'], ['ORDER_DELIVERED', 'Received by asset'], ['ORDER_EXECUTING', 'Executing'], ['ACK_GENERATED', 'Ack generated'], ['ACK_IN_TRANSIT', 'Ack in transit']]
const KIND = { commit: 'COMMIT', wait: 'WAIT', query: 'GATHER INFO' }

export default function DecisionPanel({ scenario, mission, onSubmit, submitting, onOpenAar }) {
  const [action, setAction] = useState(null)
  const [conf, setConf] = useState(70)
  const [pOk, setPOk] = useState(50)
  const [fresh, setFresh] = useState(null)
  const [comm, setComm] = useState(null)
  const [confirm, setConfirm] = useState(false)

  if (mission.decision) {
    const got = Object.fromEntries(mission.orders.map((o) => [o.stage, o]))
    const ackEnd = got.ACK_RECEIVED ? ['ACK_RECEIVED', 'Ack received', 'g'] : got.ACK_LOST ? ['ACK_LOST', 'Ack NOT received', 'r'] : ['ACK_RECEIVED', 'Ack received', '']
    return (
      <>
        <h3>Order status</h3>
        <KV k="Action">{scenario.actions[mission.decision.action]?.label || nice(mission.decision.action)}</KV>
        <KV k="Confidence">{mission.decision.confidence}%</KV>
        <KV k="Asset">{scenario.asset} · {mission.asset.status}</KV>
        <div style={{ marginTop: 10 }}>
          {[...STAGES, ackEnd.slice(0, 2)].map(([k, l], i) => {
            const o = got[k]
            const isEnd = i === STAGES.length
            const tone = isEnd ? ackEnd[2] : o ? 'g' : ''
            return <div className="stage" key={k}><span className={tone || 't3'}>{o ? (k === 'ACK_LOST' ? '✗' : '✓') : '○'} {isEnd ? ackEnd[1] : l}</span><b className="mono t2">{o ? o.clock : ''}</b></div>
          })}
        </div>
        {mission.status === 'ENDED' && (
          <>
            <div className="hl" style={{ marginTop: 14, fontSize: 13 }}><span className="t2" style={{ fontSize: 10, letterSpacing: '.1em' }}>MISSION OUTCOME</span><br />{mission.outcome}</div>
            <button className="btn pri wide" onClick={onOpenAar}>Open after-action review</button>
          </>
        )}
      </>
    )
  }

  const open = mission.phase === 'DECISION'
  const ready = open && action && fresh && comm
  const body = { action, confidence: conf, probes: { p_ok: pOk, freshest: fresh, comm_issue: comm } }
  const Seg = ({ value, set, options }) => <div className="seg">{options.map((o) => <button key={o} type="button" className={value === o ? 'on' : ''} onClick={() => set(o)}>{o}</button>)}</div>

  return (
    <>
      <h3>HQ decision</h3>
      <p style={{ fontWeight: 600, marginBottom: 10 }}>{scenario.question} — choose how to proceed.</p>
      {!open && <p className="note">The decision window opens at {clockAt(scenario.start, mission.decision_tick)}. Observe incoming reports until then.</p>}
      <div className={open ? '' : 'dis'}>
        {Object.entries(scenario.actions).map(([k, a]) => (
          <button type="button" key={k} className={`opt${action === k ? ' on' : ''}`} onClick={() => setAction(k)}><i />{a.label}<em>{KIND[a.kind]}</em></button>
        ))}
        <h4>Decision confidence</h4>
        <label>How confident are you in this decision? <b>{conf}%</b></label>
        <input type="range" min="0" max="100" value={conf} onChange={(e) => setConf(+e.target.value)} />
        <h4>Decision check</h4>
        <label>Probability that the answer to “{scenario.question}” is YES <b>{pOk}%</b></label>
        <input type="range" min="0" max="100" value={pOk} onChange={(e) => setPOk(+e.target.value)} />
        <label>Which relevant report is the freshest?</label>
        <Seg value={fresh} set={setFresh} options={scenario.probe_sources} />
        <label>Is a communication issue affecting your information?</label>
        <Seg value={comm} set={setComm} options={['YES', 'NO', 'UNSURE']} />
        <button className="btn pri wide" disabled={!ready || submitting} onClick={() => setConfirm(true)}>Confirm decision</button>
        {open && !ready && <p className="t3" style={{ fontSize: 11, marginTop: 6 }}>Select an action and answer both decision checks.</p>}
      </div>
      {confirm && (
        <div className="ov" style={{ position: 'fixed', inset: 0, background: '#000a', display: 'grid', placeItems: 'center', zIndex: 30 }}>
          <div style={{ background: 'var(--p)', border: '1px solid var(--b)', borderRadius: 8, padding: 20, width: 'min(420px,92vw)' }}>
            <h3>Confirm decision</h3>
            <KV k="Action">{scenario.actions[action].label}</KV><KV k="Confidence">{conf}%</KV>
            <KV k="Estimated probability YES">{pOk}%</KV><KV k="Freshest report">{fresh}</KV><KV k="Comm issue">{comm}</KV>
            <p className="t2" style={{ marginTop: 10, fontSize: 12 }}>This is final. The order will be sent through the degraded network.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn" onClick={() => setConfirm(false)}>Cancel</button>
              <button className="btn pri" disabled={submitting} onClick={async () => { await onSubmit(body); setConfirm(false) }}>{submitting ? 'Sending…' : 'Issue order'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
