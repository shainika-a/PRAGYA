import { api } from '../api.js'
import { useApi } from '../lib/useApi.js'
import { go } from '../lib/router.js'
import { FINDING_LABELS } from '../lib/format.js'
import TopBar from '../components/TopBar.jsx'
import { Bars, GroupedBars } from '../components/Charts.jsx'
import { Empty, ErrorBox, Loading, Panel } from '../components/UI.jsx'

const rows = (o, map = (k) => k) => Object.entries(o).map(([k, v]) => ({ label: map(k), value: v }))

export default function Analytics() {
  const { data: a, error, loading, reload } = useApi(() => api.analytics())
  return (
    <>
      <TopBar title="Analytics" subtitle="Performance across assessed missions" />
      <div className="scroll"><div className="pg">
        {loading && <Loading />}
        {error && <ErrorBox error={error} onRetry={reload} />}
        {a && a.missions === 0 && <Empty title="No assessed missions yet" action={<button className="btn pri" onClick={() => go('scenarios')}>Start training</button>}>Analytics appear after at least one mission has ended.</Empty>}
        {a && a.missions > 0 && (
          <>
            <div className="stats">
              <div><small>Assessed missions</small><b>{a.missions}</b></div>
              <div><small>Mean judgment regret</small><b>{a.mean_judgment_regret}</b><em>lower is better</em></div>
              <div><small>Mean information regret</small><b>{a.mean_information_regret}</b><em>cost of missing info</em></div>
              <div><small>Mean info age</small><b>{a.mean_info_age}s</b><em>at decision</em></div>
              <div><small>Mean confidence gap</small><b>{a.mean_confidence_gap > 0 ? '+' : ''}{a.mean_confidence_gap}</b><em>+ = overconfident</em></div>
            </div>
            <Panel title="Regret and calibration per mission">
              <GroupedBars series={a.series} keys={[{ key: 'judgment_regret', label: 'Judgment regret', color: '#E5534B' }, { key: 'information_regret', label: 'Information regret', color: '#E3A93B' }, { key: 'confidence_gap', label: 'Confidence gap', color: '#4A9EE0' }]} />
              <div className="row t2" style={{ fontSize: 11 }}><span className="r">■ Judgment regret</span><span className="a">■ Information regret</span><span className="bl">■ Confidence gap</span></div>
            </Panel>
            <div className="g2">
              <Panel title="Regret attribution"><Bars rows={rows(a.attribution)} /></Panel>
              <Panel title="Mission outcomes"><Bars rows={rows(a.outcomes)} color="#3FB97F" /></Panel>
              <Panel title="Process findings observed"><Bars rows={rows(a.findings, (k) => FINDING_LABELS[k] || k)} color="#E3A93B" /></Panel>
              <Panel title="Missions by scenario"><Bars rows={rows(a.by_scenario)} /></Panel>
            </div>
            <Panel title="Mission log">
              <table><thead><tr><th>Mission</th><th>Scenario</th><th>Judgment regret</th><th>Information regret</th><th>Confidence gap</th><th /></tr></thead>
                <tbody>{a.series.map((s) => <tr key={s.mission_id}><td><b>#{s.mission_id}</b></td><td>{s.scenario}</td><td>{s.judgment_regret}</td><td>{s.information_regret}</td><td>{s.confidence_gap}</td><td><button className="btn" onClick={() => go(`aar/${s.mission_id}`)}>AAR</button></td></tr>)}</tbody></table>
            </Panel>
          </>
        )}
      </div></div>
    </>
  )
}
