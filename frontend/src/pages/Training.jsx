import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { go } from '../lib/router.js'
import { TIMELINE_TYPES, describeEvent } from '../lib/format.js'
import TopBar from '../components/TopBar.jsx'
import StatusBar from '../components/StatusBar.jsx'
import Map, { MapSelection } from '../components/Map.jsx'
import InformationFeed from '../components/InformationFeed.jsx'
import DecisionPanel from '../components/DecisionPanel.jsx'
import MissionTimeline from '../components/MissionTimeline.jsx'
import MissionPicker from '../components/MissionPicker.jsx'
import { ErrorBox, Loading } from '../components/UI.jsx'

export default function Training({ id }) {
  if (!id) {
    return (
      <>
        <TopBar title="Training" subtitle="Open an active mission" />
        <div className="scroll"><div className="pg"><MissionPicker target="training" status="ACTIVE" title="Active missions" hint="Start a scenario to create a mission." /></div></div>
      </>
    )
  }
  return <Simulator key={id} id={id} />
}

function Simulator({ id }) {
  const [scn, setScn] = useState(null)
  const [m, setM] = useState(null)
  const [error, setError] = useState(null)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(5)
  const [items, setItems] = useState([])
  const [newIds, setNewIds] = useState(new Set())
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState(null)
  const msgs = useRef({})
  const seen = useRef(new Set())

  const addItems = useCallback((events) => {
    setItems((prev) => {
      const have = new Set(prev.map((i) => i.key))
      const add = events.filter((e) => TIMELINE_TYPES.has(e.type) && !have.has(`e${e.id}`)).map((e) => ({
        key: `e${e.id}`, id: e.id, tick: e.tick, clock: e.timestamp, type: e.type, ...describeEvent(e, (k) => msgs.current[k]),
      }))
      return [...prev, ...add].sort((a, b) => a.tick - b.tick || a.id - b.id)
    })
  }, [])

  const apply = useCallback((s) => {
    s.reports.forEach((r) => { msgs.current[r.message_id] = { source: r.source, content: r.content } })
    setNewIds(new Set(s.reports.filter((r) => !seen.current.has(r.message_id)).map((r) => r.message_id)))
    s.reports.forEach((r) => seen.current.add(r.message_id))
    if (s.new_events) addItems(s.new_events)
    if (s.phase === 'DECISION' || s.status === 'ENDED') setRunning(false)
    setM(s)
  }, [addItems])

  // Initial load: mission state, then the scenario it belongs to.
  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const s = await api.mission(id)
        const sc = await api.scenario(s.scenario_id)
        if (!live) return
        setScn(sc)
        // Rebuild what the trainee already knew from the released state (the backend does not expose past trainee events live).
        const hist = [{ id: -1, tick: 0, timestamp: sc.start, type: 'MISSION_STARTED', source: 'SYSTEM', target: '', payload: { seed: s.seed } }]
        s.reports.forEach((r) => hist.push({ id: -1000 - r.received_tick, tick: r.received_tick, timestamp: r.received_clock, type: 'MESSAGE_DELIVERED', source: r.source, target: 'HQ', payload: { id: r.message_id } }))
        s.orders.forEach((o, i) => hist.push({ id: -500 + i, tick: o.tick, timestamp: o.clock, type: o.stage, source: '', target: '', payload: { action: s.decision?.action } }))
        s.reports.forEach((r) => { msgs.current[r.message_id] = { source: r.source, content: r.content }; seen.current.add(r.message_id) })
        addItems(hist)
        setM(s)
        setRunning(s.status === 'ACTIVE' && s.phase !== 'DECISION')
      } catch (e) { if (live) setError(e) }
    })()
    return () => { live = false }
  }, [id, addItems])

  // Backend-driven clock: every second ask the backend to advance the mission by `speed` ticks.
  useEffect(() => {
    if (!running || !m || m.status === 'ENDED' || m.phase === 'DECISION') return
    let live = true
    const t = setTimeout(async () => {
      try { const s = await api.tick(id, speed); if (live) apply(s) } catch (e) { if (live) { setError(e); setRunning(false) } }
    }, 1000)
    return () => { live = false; clearTimeout(t) }
  }, [running, m, speed, id, apply])

  async function skip() {
    try { apply(await api.tick(id, Math.min(600, Math.max(1, m.decision_tick - m.tick)))) } catch (e) { setError(e) }
  }

  async function decide(body) {
    setBusy(true); setError(null)
    try {
      const s = await api.decide(id, body)
      addItems([{ id: -2, tick: s.tick, timestamp: s.clock, type: 'DECISION_MADE', source: 'HQ', target: '', payload: { action: body.action, confidence: body.confidence } }])
      apply(s)
      setRunning(true)
    } catch (e) { setError(e) } finally { setBusy(false) }
  }

  if (error && !m) return <><TopBar title="Training" /><div className="scroll"><div className="pg"><ErrorBox error={error} onRetry={() => window.location.reload()} /></div></div></>
  if (!m || !scn) return <><TopBar title="Training" /><Loading text="Loading mission…" /></>

  const ended = m.status === 'ENDED'
  return (
    <>
      <TopBar title={scn.name} subtitle={`Mission #${id} · seed ${m.seed}`}>
        <span className="clk">{m.clock}</span>
        {!ended && (
          <>
            <button className="btn" disabled={m.phase === 'DECISION'} onClick={() => setRunning((r) => !r)}>{running ? 'Pause' : 'Run'}</button>
            <select value={speed} onChange={(e) => setSpeed(+e.target.value)} aria-label="Simulation speed">
              {[1, 5, 10, 30].map((v) => <option key={v} value={v}>{v}× speed</option>)}
            </select>
            <button className="btn" disabled={m.phase !== 'OBSERVING'} onClick={skip}>Skip to decision</button>
          </>
        )}
        {ended && <><button className="btn pri" onClick={() => go(`aar/${id}`)}>After-action review</button><button className="btn" onClick={() => go(`replay/${id}`)}>Replay</button></>}
      </TopBar>
      <StatusBar mission={m} />
      {error && <div style={{ padding: '0 12px' }}><ErrorBox error={error} /></div>}
      <div className="simgrid">
        <div className="mapw">
          <Map scenario={scn} links={m.links} reports={m.reports} asset={m.asset} tick={m.tick} chosenAction={m.decision?.action} selected={selected} onSelect={setSelected} />
          <div className="banner">TRAINEE VIEW · DEGRADED INFORMATION</div>
          <div className="maplegend">
            <span><i style={{ color: '#3FB97F' }} />Link nominal</span><span><i style={{ color: '#E3A93B', borderTopStyle: 'dashed' }} />Link degraded</span>
            <span><i style={{ color: '#E5534B' }} />Link down</span>
          </div>
          <MapSelection scenario={scn} selected={selected} links={m.links} reports={m.reports} asset={m.asset} onClose={() => setSelected(null)} />
        </div>
        <div>
          <h3>Information feed</h3>
          <InformationFeed reports={m.reports} links={m.links} newIds={newIds} />
          <div className="blind">Only reports that reached HQ are shown. Reports still in transit or lost on a degraded link are not visible — by design.</div>
        </div>
        <div>
          <DecisionPanel scenario={scn} mission={m} onSubmit={decide} submitting={busy} onOpenAar={() => go(`aar/${id}`)} />
        </div>
      </div>
      <MissionTimeline items={items} tick={m.tick} decisionTick={m.decision_tick} endTick={m.end_tick} />
    </>
  )
}
