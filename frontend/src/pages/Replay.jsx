import { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { useApi } from '../lib/useApi.js'
import { go } from '../lib/router.js'
import { describeEvent, mmss } from '../lib/format.js'
import TopBar from '../components/TopBar.jsx'
import Map from '../components/Map.jsx'
import InformationFeed from '../components/InformationFeed.jsx'
import MissionPicker from '../components/MissionPicker.jsx'
import { Chip, ErrorBox, Loading, Panel } from '../components/UI.jsx'

const VIEWS = [['trainee', 'Trainee view'], ['truth', 'Ground truth'], ['comm', 'Communications']]

export default function Replay({ id }) {
  if (!id) return <><TopBar title="Replay" subtitle="Select a completed mission" /><div className="scroll"><div className="pg"><MissionPicker target="replay" status="ENDED" title="Completed missions" hint="Replay is available once a mission has ended." /></div></div></>
  return <Player id={id} />
}

function Player({ id }) {
  const [view, setView] = useState('trainee')
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [at, setAt] = useState(null)
  const [atErr, setAtErr] = useState(null)

  const { data: scn, error: e1, loading: l1, reload } = useApi(async () => api.scenario((await api.mission(id)).scenario_id), [id])
  const { data: full, error: e2, loading: l2 } = useApi(() => api.replay(id, view), [id, view])

  // State at the scrubbed tick comes from the backend (debounced while dragging).
  useEffect(() => {
    if (!full) return
    let live = true
    const h = setTimeout(() => api.replay(id, view, t).then((r) => live && (setAt(r), setAtErr(null)), (e) => live && setAtErr(e)), 120)
    return () => { live = false; clearTimeout(h) }
  }, [id, view, t, full])

  useEffect(() => {
    if (!playing || !full) return
    const h = setTimeout(() => {
      const next = full.ticks.find((x) => x > t)
      if (next == null || next >= full.end_tick) { setT(full.end_tick); setPlaying(false) } else setT(next)
    }, 900 / speed)
    return () => clearTimeout(h)
  }, [playing, t, full, speed])

  const msgIdx = useMemo(() => {
    const m = {}
    if (full) {
      full.events.forEach((e) => { if (e.type === 'MESSAGE_GENERATED') m[e.payload.id] = { source: e.source, content: e.payload.content } })
      ;(full.state.reports || []).forEach((r) => { m[r.message_id] = { source: r.source, content: r.content } })
      ;(full.state.messages || []).forEach((r) => { m[r.message_id] = { source: r.source, content: r.content } })
    }
    return m
  }, [full])

  const err = e1 || e2 || atErr
  if (err) return <><TopBar title="Replay" /><div className="scroll"><div className="pg"><ErrorBox error={err} onRetry={reload} />{err.status === 409 && <button className="btn" onClick={() => go(`training/${id}`)}>Back to mission</button>}</div></div></>
  if (l1 || l2 || !scn || !full) return <><TopBar title="Replay" /><Loading text="Loading replay…" /></>

  const s = (at || full).state
  const curTick = Math.max(0, ...full.events.filter((e) => e.tick <= t).map((e) => e.tick))
  const switchView = (v) => { setView(v); setAt(null) }

  return (
    <>
      <TopBar title="Mission replay" subtitle={`${scn.name} · mission #${id}`}>
        <div className="tabs">{VIEWS.map(([k, l]) => <button key={k} className={view === k ? 'on' : ''} onClick={() => switchView(k)}>{l}</button>)}</div>
        <button className="btn" onClick={() => go(`aar/${id}`)}>AAR</button>
      </TopBar>
      <div className="scroll"><div className="pg" style={{ maxWidth: 1400 }}>
        <div className="gr">
          <div>
            <div className="map-static">
              <Map scenario={scn} links={s.links} reports={view === 'trainee' ? s.reports || [] : []} asset={s.asset} tick={t} mode={view} messages={s.messages || []} interactive={false} />
              <div className={`banner ${view === 'truth' ? 'truth' : ''}`}>{view === 'trainee' ? 'WHAT THE TRAINEE COULD SEE' : view === 'truth' ? `GROUND TRUTH · ${s.hypothesis?.label}` : 'COMMUNICATION LAYER'} · {s.clock}</div>
            </div>
            <Panel title={view === 'trainee' ? 'Information held at this moment' : view === 'truth' ? 'Hidden world state' : 'Message lifecycle'} className="" >
              {view === 'trainee' && <InformationFeed reports={s.reports} links={s.links} />}
              {view === 'truth' && <>
                <p style={{ fontWeight: 600 }}>{s.hypothesis.question} <Chip tone={s.hypothesis.state === 'OK' ? 'g' : 'r'}>{s.hypothesis.label}</Chip></p>
                {s.observations.length === 0 ? <p className="t2" style={{ marginTop: 6 }}>No hidden observations yet.</p> : s.observations.map((o, i) => <div className="kv" key={i}><span>{o.clock} · {o.entity}</span><b>{o.note}</b></div>)}
              </>}
              {view === 'comm' && (s.messages.length === 0 ? <p className="t2">No messages yet.</p> :
                <table><thead><tr><th>Source</th><th>Content</th><th>Link</th><th>Status</th></tr></thead><tbody>
                  {s.messages.map((m) => <tr key={m.message_id}><td><b>{m.source}</b>{m.destination !== 'HQ' ? ` → ${m.destination}` : ''}</td><td>{m.content}</td><td>{m.link}</td>
                    <td><Chip tone={m.status === 'DELIVERED' ? 'g' : m.status === 'LOST' ? 'r' : 'a'}>{m.status}</Chip></td></tr>)}</tbody></table>)}
            </Panel>
          </div>
          <Panel title={`Events (${full.events.filter((e) => e.tick <= t).length}/${full.events.length})`} className="">
            <div style={{ maxHeight: '68vh', overflow: 'auto' }}>
              {full.events.map((e) => {
                const d = describeEvent(e, (k) => msgIdx[k])
                const cls = e.tick > t ? 'future' : e.tick === curTick ? 'cur' : ''
                return <div key={e.id} className={`ev ${d.tone} ${cls}`} onClick={() => { setPlaying(false); setT(e.tick) }}>
                  <span className="tm">{e.timestamp}</span><div><div className="lbl">{d.label}</div>{d.detail && <div className="dt">{d.detail}</div>}</div></div>
              })}
            </div>
          </Panel>
        </div>
      </div></div>
      <div className="scrub">
        <button className="btn pri" onClick={() => { if (t >= full.end_tick) setT(0); setPlaying((p) => !p) }}>{playing ? 'Pause' : t >= full.end_tick ? 'Restart' : 'Play'}</button>
        <button className="btn" onClick={() => { const p = [...full.ticks].reverse().find((x) => x < t); setT(p ?? 0) }}>◂ Prev</button>
        <button className="btn" onClick={() => { const n = full.ticks.find((x) => x > t); setT(n ?? full.end_tick) }}>Next ▸</button>
        <div className="rng">
          <div className="ticks">{full.ticks.map((k) => <i key={k} style={{ left: `${(k / full.end_tick) * 100}%` }} />)}</div>
          <input type="range" min="0" max={full.end_tick} value={t} onChange={(e) => { setPlaying(false); setT(+e.target.value) }} aria-label="Replay position" />
        </div>
        <span className="mono t2" style={{ width: 120, textAlign: 'right' }}>T+{mmss(t)} / {mmss(full.end_tick)}</span>
        <select value={speed} onChange={(e) => setSpeed(+e.target.value)}>{[1, 2, 4].map((v) => <option key={v} value={v}>{v}×</option>)}</select>
      </div>
    </>
  )
}
