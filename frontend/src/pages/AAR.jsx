import { api } from '../api.js'
import { useApi } from '../lib/useApi.js'
import { go } from '../lib/router.js'
import { clockAt, mmss } from '../lib/format.js'
import TopBar from '../components/TopBar.jsx'
import MissionPicker from '../components/MissionPicker.jsx'
import { Chip, ErrorBox, KV, Loading, Panel, Tip } from '../components/UI.jsx'

const WHY = {
  information: 'Given what reached you, this was the best available choice. The loss came from information that was missing, late, or lost — not from your judgment.',
  decision: 'Another action had a higher expected value given the reports you actually held. The shortfall comes from how the available information was weighed.',
  none: 'No meaningful regret: your action matched the best modeled action and nothing material was withheld.',
}

export default function AAR({ id }) {
  if (!id) return <><TopBar title="After-action review" subtitle="Select a completed mission" /><div className="scroll"><div className="pg"><MissionPicker target="aar" status="ENDED" title="Completed missions" hint="Finish a mission to unlock its review." /></div></div></>
  return <Review id={id} />
}

function Review({ id }) {
  const { data: a, error, loading, reload } = useApi(async () => {
    const aar = await api.aar(id)
    const scn = await api.scenario(aar.scenario_id)
    return { aar, scn }
  }, [id])
  if (loading) return <><TopBar title="After-action review" /><Loading text="Loading review…" /></>
  if (error) return <><TopBar title="After-action review" /><div className="scroll"><div className="pg"><ErrorBox error={error} onRetry={reload} />{error.status === 409 && <button className="btn" onClick={() => go(`training/${id}`)}>Back to mission</button>}</div></div></>
  const { aar: r, scn } = a
  const acts = scn.actions
  const eu = Object.entries(r.best_modeled_action.expected_utility)
  const euMax = Math.max(...eu.map(([, v]) => v))
  const bad = r.outcome.startsWith('DELAYED')
  const attrTone = r.attribution === 'information' ? 'a' : r.attribution === 'decision' ? 'r' : 'g'

  return (
    <>
      <TopBar title="After-action review" subtitle={`${r.scenario_name} · mission #${id}`}>
        <button className="btn" onClick={() => go(`replay/${id}`)}>Replay</button><button className="btn" onClick={() => go('analytics')}>Analytics</button>
      </TopBar>
      <div className="scroll"><div className="pg">
        <div className={`hl ${bad ? 'r' : 'g'}`}>{r.outcome}<p>You chose <b>{r.decision.label}</b> at {r.your_information.clock} with {r.decision.confidence}% confidence. Attribution of regret: <Chip tone={attrTone}>{r.attribution}</Chip></p></div>
        <p className="t2" style={{ marginBottom: 14 }}>{WHY[r.attribution]}</p>

        <div className="stats">
          <div><small><Tip term="JR">Judgment regret</Tip></small><b>{r.judgment_regret}</b><em>vs best modeled action</em></div>
          <div><small><Tip term="IR">Information regret</Tip></small><b>{r.information_regret}</b><em>cost of missing information</em></div>
          <div><small><Tip term="EVPI">Value of perfect info</Tip></small><b>{r.expected_value_of_perfect_information}</b><em>EVPI</em></div>
          <div><small><Tip term="GAPCONF">Confidence gap</Tip></small><b>{r.calibration.gap > 0 ? '+' : ''}{r.calibration.gap}</b><em>points</em></div>
          <div><small>Mean info age</small><b>{r.mean_info_age}s</b><em>at decision</em></div>
        </div>

        <div className="g2">
          <Panel title="What you knew" right={<Chip tone="bl">{r.your_information.clock}</Chip>}>
            {r.your_information.reports.length === 0 && <p className="t2">No reports had reached HQ.</p>}
            {r.your_information.reports.map((x, i) => (
              <div className="kv" key={i}><div><b>{x.source}</b> — {x.content}<div className="t3" style={{ fontSize: 10.5 }}>confidence {Math.round(x.confidence * 100)}%</div></div><b className={x.age >= 120 ? 'r' : x.age >= 60 ? 'a' : 'g'}>{mmss(x.age)} old</b></div>))}
            <KV k="Degraded links">{r.your_information.degraded_links.join(', ') || 'none'}</KV>
            {r.your_information.unreceived.length > 0 && <div className="blind"><b>Never received:</b> {r.your_information.unreceived.join(' · ')}</div>}
          </Panel>
          <Panel title="What was actually true" right={<Tip term="TRUTH"><Chip>ground truth</Chip></Tip>}>
            <p style={{ fontWeight: 600 }}>{r.ground_truth.question}</p>
            <div className={`hl ${r.ground_truth.state === 'OK' ? 'g' : 'r'}`} style={{ marginTop: 8 }}>{r.ground_truth.label}</div>
            <KV k="Best with complete information">{r.best_with_complete_information.label}</KV>
            <KV k="Best given your information">{r.best_modeled_action.label}</KV>
            <KV k="Your action" tone={r.decision.action === r.best_modeled_action.action ? 'g' : 'a'}>{r.decision.label}</KV>
          </Panel>
        </div>

        <div className="g2">
          <Panel title="Expected utility by action" right={<span className="t2" style={{ fontSize: 11 }}>P(bad) = {Math.round(r.belief.p_bad * 100)}% given delivered reports</span>}>
            {eu.map(([k, v]) => (
              <div className="bar" key={k}><span>{acts[k]?.label || k}{k === r.decision.action ? ' ◂ you' : ''}</span><div><i className={v === euMax ? 'best' : k === r.decision.action ? 'you' : ''} style={{ width: `${(v / Math.max(euMax, 1)) * 100}%` }} /></div><b>{v}</b></div>))}
            <p className="t3" style={{ fontSize: 11, marginTop: 8 }}>Green = best modeled action. Blue = your action.</p>
          </Panel>
          <Panel title="Calibration">
            <KV k="Stated confidence">{r.calibration.stated_confidence}%</KV><KV k="Model support">{r.calibration.model_support}%</KV>
            <KV k="Your P(OK) estimate">{r.calibration.probe_estimate}%</KV><KV k="Model P(OK)">{Math.round(r.belief.p_ok * 100)}%</KV>
            <KV k="Probe error">{r.calibration.probe_error} pts</KV>
            <KV k="Freshest-report answer">{r.decision.probes.freshest}</KV><KV k="Comm-issue answer">{r.decision.probes.comm_issue}</KV>
          </Panel>
        </div>

        <Panel title="Information gap — what happened vs what reached you" right={<Tip term="GAP"><Chip>timeline</Chip></Tip>}>
          <div className="vt">{r.information_gap.map((c, i) => <div key={i} className={c.severity}><b>{c.clock}</b><span>{c.text}</span></div>)}</div>
        </Panel>

        <Panel title="Communication events (reports to HQ)">
          <table><thead><tr><th>Source</th><th>Report</th><th>Generated</th><th>Delivered</th><th>Transit</th><th>Disposition</th></tr></thead>
            <tbody>{r.communication_events.map((c) => (
              <tr key={c.message_id}><td><b>{c.source}</b></td><td>{c.content}</td><td className="mono">{clockAt(scn.start, c.generated)}</td>
                <td className="mono">{c.delivered != null ? clockAt(scn.start, c.delivered) : '—'}</td><td className="mono">{c.latency}s</td>
                <td><Chip tone={c.disposition === 'DELIVERED' ? 'g' : c.disposition === 'LOST' ? 'r' : 'a'}>{c.disposition.replaceAll('_', ' ')}</Chip></td></tr>))}</tbody></table>
        </Panel>

        <Panel title="Process findings">
          {r.findings.map((f) => (
            <div className="find" key={f.id}><Chip tone={f.observed ? 'a' : 'g'}>{f.observed ? 'observed' : 'clear'}</Chip><div><b>{f.label}</b><small>{f.evidence}</small></div></div>))}
        </Panel>
        <p className="t3" style={{ fontSize: 11 }}>{r.assumptions} · {r.event_count} events · chain head {r.head_hash.slice(0, 16)}…</p>
      </div></div>
    </>
  )
}
