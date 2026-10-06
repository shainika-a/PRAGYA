import { api } from '../api.js'
import { useApi } from '../lib/useApi.js'
import { go } from '../lib/router.js'
import { Empty, ErrorBox, Loading, Chip } from './UI.jsx'

// Lists missions from the backend so AAR / Replay / Training can be opened without an id in the URL.
export default function MissionPicker({ target, status, title, hint }) {
  const { data, error, loading, reload } = useApi(async () => {
    const [m, s] = await Promise.all([api.missions(), api.scenarios()])
    return { m: status ? m.filter((x) => x.status === status) : m, names: Object.fromEntries(s.map((x) => [x.id, x.name])) }
  }, [target])
  if (loading) return <Loading />
  if (error) return <ErrorBox error={error} onRetry={reload} />
  if (!data.m.length) return <Empty title={`No ${status === 'ENDED' ? 'completed' : status === 'ACTIVE' ? 'active' : ''} missions`} action={<button className="btn pri" onClick={() => go('scenarios')}>Browse scenarios</button>}>{hint}</Empty>
  return (
    <div className="pn"><div className="hd"><h3>{title}</h3></div>
      <table><thead><tr><th>Mission</th><th>Scenario</th><th>Seed</th><th>Status</th></tr></thead>
        <tbody>{data.m.map((x) => (
          <tr key={x.id} className="click" onClick={() => go(`${target}/${x.id}`)}>
            <td><b>#{x.id}</b></td><td>{data.names[x.scenario_id] || x.scenario_id}</td><td>{x.seed}</td>
            <td><Chip tone={x.status === 'ENDED' ? 'bl' : 'g'}>{x.status}</Chip></td>
          </tr>))}</tbody></table>
    </div>
  )
}
