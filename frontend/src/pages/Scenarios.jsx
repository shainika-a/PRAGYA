import { useState } from 'react'
import { api } from '../api.js'
import { useApi } from '../lib/useApi.js'
import { go } from '../lib/router.js'
import { clockAt } from '../lib/format.js'
import TopBar from '../components/TopBar.jsx'
import Map from '../components/Map.jsx'
import { Chip, Empty, ErrorBox, KV, Loading, Panel } from '../components/UI.jsx'

export default function Scenarios() {
  const { data, error, loading, reload } = useApi(() => api.scenarios())
  const [sel, setSel] = useState(null)
  const [seed, setSeed] = useState('')
  const [busy, setBusy] = useState(false)
  const [startErr, setStartErr] = useState(null)
  const scn = data?.find((s) => s.id === sel) || null

  async function start() {
    setBusy(true); setStartErr(null)
    try {
      const m = await api.createMission(scn.id, seed)
      go(`training/${m.mission_id}`)
    } catch (e) { setStartErr(e) } finally { setBusy(false) }
  }

  return (
    <>
      <TopBar title="Scenarios" subtitle="Select an operational situation" />
      <div className="scroll"><div className="pg">
        {loading && <Loading text="Loading scenarios…" />}
        {error && <ErrorBox error={error} onRetry={reload} />}
        {data && data.length === 0 && <Empty title="No scenarios available">The backend returned an empty scenario list.</Empty>}
        {data && data.length > 0 && (
          <>
            <div className="sc">
              {data.map((s) => (
                <button key={s.id} className={`card${sel === s.id ? ' on' : ''}`} onClick={() => setSel(s.id)}>
                  <div className="row"><Chip tone={s.difficulty === 'HIGH' ? 'r' : 'a'}>{s.difficulty}</Chip><Chip>{s.comm_challenge}</Chip></div>
                  <h2>{s.name}</h2><span className="eyebrow">{s.subtitle}</span><p>{s.description}</p>
                </button>))}
            </div>
            {!scn && <p className="t2">Select a scenario to see its briefing.</p>}
            {scn && (
              <div className="gr">
                <div className="map-static"><Map scenario={scn} links={Object.fromEntries(scn.links.map((l) => [l, { status: 'GOOD', packet_loss: 0, latency: 0, bandwidth: 0 }]))} tick={0} interactive={false} /></div>
                <div>
                  <Panel title="Briefing">
                    <p style={{ fontWeight: 600, marginBottom: 8 }}>{scn.question}</p>
                    <KV k="Primary challenge">{scn.primary_challenge}</KV><KV k="Communications">{scn.comm_challenge}</KV>
                    <KV k="Mission start">{scn.start}</KV><KV k="Decision window">{clockAt(scn.start, scn.decision_tick)} (T+{scn.decision_tick}s)</KV>
                    <KV k="Managed asset">{scn.asset}</KV><KV k="Entities">{scn.entities.join(' · ')}</KV><KV k="Network links">{scn.links.join(' · ')}</KV>
                    <h4>Available actions</h4>
                    {Object.values(scn.actions).map((a) => <div className="kv" key={a.label}><b>{a.label}</b><span>{a.kind}</span></div>)}
                    <label>Seed (optional — blank uses the scenario default)</label>
                    <input type="number" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="default" />
                    {startErr && <ErrorBox error={startErr} />}
                    <button className="btn pri wide" disabled={busy} onClick={start}>{busy ? 'Creating mission…' : 'Start mission'}</button>
                  </Panel>
                </div>
              </div>
            )}
          </>
        )}
      </div></div>
    </>
  )
}
