import { api } from '../api.js'
import { useApi } from '../lib/useApi.js'
import { go } from '../lib/router.js'
import TopBar from '../components/TopBar.jsx'
import { Chip, Empty, ErrorBox, Loading, Panel } from '../components/UI.jsx'

export default function Dashboard() {
  const { data, error, loading, reload } = useApi(async () => {
    const [scenarios, missions, analytics] = await Promise.all([api.scenarios(), api.missions(), api.analytics()])
    return { scenarios, missions, analytics }
  })
  const names = data ? Object.fromEntries(data.scenarios.map((s) => [s.id, s.name])) : {}
  const active = data?.missions.find((m) => m.status === 'ACTIVE')
  const a = data?.analytics

  return (
    <>
      <TopBar title="Dashboard" subtitle="Decision training in degraded communication environments" />
      <div className="scroll"><div className="pg">
        <div className="ph">
          <div className="eyebrow">PRAGYA</div>
          <h1>Train decisions on the information that actually arrives</h1>
          <p>The simulator knows what is really happening. You only see the reports that survive a degraded network — then PRAGYA shows you what you missed and why it mattered.</p>
          <div className="row" style={{ marginTop: 14 }}>
            {active ? <button className="btn pri" onClick={() => go(`training/${active.id}`)}>Resume mission #{active.id}</button> : null}
            <button className={`btn ${active ? '' : 'pri'}`} onClick={() => go('scenarios')}>Start new training</button>
          </div>
        </div>
        {loading && <Loading text="Contacting backend…" />}
        {error && <ErrorBox error={error} onRetry={reload} />}
        {data && (
          <>
            <div className="stats">
              <div><small>Missions</small><b>{data.missions.length}</b><em>{data.missions.filter((m) => m.status === 'ENDED').length} completed</em></div>
              <div><small>Active mission</small><b>{active ? `#${active.id}` : '—'}</b><em>{active ? names[active.scenario_id] : 'none in progress'}</em></div>
              <div><small>Mean judgment regret</small><b>{a.missions ? a.mean_judgment_regret : '—'}</b><em>{a.missions ? `over ${a.missions} assessed` : 'no assessed missions'}</em></div>
              <div><small>Mean information regret</small><b>{a.missions ? a.mean_information_regret : '—'}</b><em>utility points</em></div>
              <div><small>Mean info age at decision</small><b>{a.missions ? `${a.mean_info_age}s` : '—'}</b><em>delivered reports</em></div>
            </div>
            <div className="gr">
              <Panel title="Recent missions" right={<button className="btn" onClick={() => go('analytics')}>Analytics</button>}>
                {data.missions.length === 0 ? (
                  <Empty title="No missions yet" action={<button className="btn pri" onClick={() => go('scenarios')}>Choose a scenario</button>}>Start a scenario to create your first mission.</Empty>
                ) : (
                  <table><thead><tr><th>#</th><th>Scenario</th><th>Status</th><th>Tick</th><th /></tr></thead>
                    <tbody>{data.missions.slice(0, 8).map((m) => (
                      <tr key={m.id}>
                        <td><b>{m.id}</b></td><td>{names[m.scenario_id] || m.scenario_id}</td>
                        <td><Chip tone={m.status === 'ENDED' ? 'bl' : 'g'}>{m.status}</Chip></td><td className="mono">{m.tick}</td>
                        <td style={{ textAlign: 'right' }}>
                          {m.status === 'ENDED' ? <><button className="btn" onClick={() => go(`aar/${m.id}`)}>AAR</button> <button className="btn" onClick={() => go(`replay/${m.id}`)}>Replay</button></> : <button className="btn pri" onClick={() => go(`training/${m.id}`)}>Resume</button>}
                        </td>
                      </tr>))}</tbody></table>
                )}
              </Panel>
              <div>
                <Panel title="Available scenarios">
                  {data.scenarios.length === 0 ? <p className="t2">The backend returned no scenarios.</p> : data.scenarios.map((s) => (
                    <div key={s.id} className="kv" style={{ alignItems: 'center' }}>
                      <div><b>{s.name}</b><div className="t2" style={{ fontSize: 11 }}>{s.subtitle}</div></div><Chip tone={s.difficulty === 'HIGH' ? 'r' : 'a'}>{s.difficulty}</Chip>
                    </div>))}
                </Panel>
                <Panel title="How a mission works">
                  <div className="flow" style={{ gridTemplateColumns: '1fr' }}>
                    <div><b>1 · OBSERVE</b><p>Reports arrive late, stale, or never.</p></div>
                    <div><b>2 · DECIDE</b><p>Commit, wait, or gather information — and state your confidence.</p></div>
                    <div><b>3 · REVIEW</b><p>Compare your information with ground truth and quantify regret.</p></div>
                  </div>
                </Panel>
              </div>
            </div>
          </>
        )}
      </div></div>
    </>
  )
}
