import { useMemo } from 'react'
import { H, W, assetPosition, px, routeKeyForAction, routeKeyForLabel } from '../lib/geo.js'
import { mmss } from '../lib/format.js'
import { KV } from './UI.jsx'

const COL = { GOOD: '#3FB97F', DEGRADED: '#E3A93B', DOWN: '#E5534B' }
const SHAPES = {
  HQ: <circle r="2.2" fill="#4A9EE0" />,
  RELAY: <path d="M0-2.6 2.6 0 0 2.6-2.6 0Z" fill="#4A9EE0" />,
  UAV: <path d="M0-2.6 2.6 0 0 2.6-2.6 0Z" fill="none" stroke="#E8EEF2" strokeWidth=".5" />,
  VESSEL: <path d="M0-2.6 2.6 2H-2.6Z" fill="#8B9AA5" />,
  CONVOY: <rect x="-2" y="-2" width="4" height="4" fill="#E8EEF2" />,
  TEAM: <circle r="2" fill="none" stroke="#E8EEF2" strokeWidth=".5" />,
}

// Operational map. Draws only what the caller passes in: in trainee mode that is the information state the backend released.
export default function Map({ scenario, links, reports = [], asset, tick, mode = 'trainee', messages = [], chosenAction, selected, onSelect, truth, interactive = true }) {
  const map = scenario.map
  const pos = useMemo(() => {
    const p = Object.fromEntries(Object.entries(map.entities).map(([k, v]) => [k, px(v)]))
    if (scenario.asset) p[scenario.asset] = assetPosition(scenario, asset, tick)
    return p
  }, [scenario, asset, tick, map])
  const lastBy = {}
  reports.forEach((r) => { if (!(r.source in lastBy) || r.age < lastBy[r.source].age) lastBy[r.source] = r })
  const chosen = chosenAction ? routeKeyForAction(scenario, chosenAction) : asset && asset.route ? routeKeyForLabel(scenario, asset.route) : null
  const lost = messages.filter((m) => m.status === 'LOST')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Operational map">
      <defs><pattern id="grid" width="8.5" height="10" patternUnits="userSpaceOnUse"><path d="M8.5 0H0V10" fill="none" stroke="#14232E" strokeWidth=".2" /></pattern></defs>
      <rect width={W} height={H} fill="url(#grid)" />
      {Object.entries(map.routes || {}).map(([k, path]) => {
        const on = k === chosen
        const mid = px(path[Math.floor(path.length / 2)])
        return (
          <g key={k}>
            <polyline points={path.map((q) => px(q).join(',')).join(' ')} fill="none" stroke={on ? '#4A9EE0' : '#2f4558'} strokeWidth={on ? 0.7 : 0.5} strokeDasharray={on ? '0' : '1.4 1.6'} />
            <text className="lb2" x={mid[0] + 1.5} y={mid[1] - 1.5}>{`ROUTE ${k}`}</text>
          </g>
        )
      })}
      {map.destination && (() => { const d = px(map.destination); return <g><circle cx={d[0]} cy={d[1]} r="2.6" fill="none" stroke="#E8EEF2" strokeWidth=".4" /><circle cx={d[0]} cy={d[1]} r=".6" fill="#E8EEF2" /><text className="lb" x={d[0]} y={d[1] + 6} textAnchor="middle">DESTINATION</text></g> })()}
      {Object.entries(map.ports || {}).map(([n, c]) => { const d = px(c); return <g key={n}><rect x={d[0] - 1.8} y={d[1] - 1.8} width="3.6" height="3.6" fill="none" stroke="#8B9AA5" strokeWidth=".4" /><text className="lb" x={d[0]} y={d[1] + 6} textAnchor="middle">{n.toUpperCase()}</text></g> })}

      {Object.entries(links).map(([k, l]) => {
        const [a, b] = k.split('-')
        if (!pos[a] || !pos[b]) return null
        const [x1, y1] = pos[a], [x2, y2] = pos[b], on = selected && selected[0] === 'l' && selected[1] === k
        return (
          <g key={k}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={COL[l.status] || '#8B9AA5'} strokeWidth={on ? 1 : 0.6} className={l.status === 'DEGRADED' ? 'dg' : ''} opacity={l.status === 'GOOD' ? 0.55 : 1} />
            {l.status !== 'GOOD' && <text className="lb2" x={(x1 + x2) / 2 + 1.5} y={(y1 + y2) / 2 - 1} style={{ fill: COL[l.status] }}>{Math.round(l.packet_loss * 100)}% LOSS</text>}
            {interactive && <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth="4" style={{ cursor: 'pointer' }} onClick={() => onSelect?.(['l', k])} />}
          </g>
        )
      })}

      {mode === 'comm' && lost.map((m) => {
        const key = Object.keys(links).find((k) => k === m.link) || m.link
        const [a, b] = (key || '').split('-')
        if (!pos[a] || !pos[b]) return null
        const mx = (pos[a][0] + pos[b][0]) / 2, my = (pos[a][1] + pos[b][1]) / 2
        return <g key={m.message_id}><circle cx={mx} cy={my} r="2.4" fill="#2a1413" stroke="#E5534B" strokeWidth=".4" /><text className="lb2" x={mx + 3.2} y={my + 0.8} style={{ fill: '#E5534B' }}>✗ {m.source} LOST</text></g>
      })}

      {scenario.entities.map((id) => {
        if (!pos[id]) return null
        const [x, y] = pos[id], last = lastBy[id], isAsset = id === scenario.asset
        const sub = id === 'HQ' ? '' : last ? `last report ${mmss(last.age)} ago` : mode === 'trainee' ? 'no report received' : ''
        return (
          <g key={id} className="en" transform={`translate(${x},${y})`} onClick={() => interactive && onSelect?.(['e', id])}>
            <circle className="hit" r="5" fill="transparent" />
            {selected && selected[0] === 'e' && selected[1] === id && <circle r="4" fill="none" stroke="#4A9EE0" strokeWidth=".3" />}
            {isAsset && asset && ['HALTED', 'DELAYED'].includes(asset.status) && <circle r="4" fill="#E5534B22" stroke="#E5534B" strokeWidth=".4" className="pulse" />}
            {SHAPES[id] || <circle r="2" fill="#8B9AA5" />}
            <text className="lb" y="6" textAnchor="middle">{id}{isAsset && asset && asset.status !== 'STAGED' ? ` · ${asset.status}` : ''}</text>
            {sub && <text className="lb2" y="8.6" textAnchor="middle">{sub}</text>}
          </g>
        )
      })}
    </svg>
  )
}

// Detail card for a clicked entity or link.
export function MapSelection({ scenario, selected, links, reports, asset, onClose }) {
  if (!selected) return null
  const [kind, id] = selected
  let body
  if (kind === 'l') {
    const l = links[id]
    if (!l) return null
    const last = reports.find((r) => r.link === id)
    body = <>
      <h4>{id.replace('-', ' → ')}<span onClick={onClose}>×</span></h4>
      <KV k="Status" tone={l.status === 'GOOD' ? 'g' : l.status === 'DOWN' ? 'r' : 'a'}>{l.status}</KV>
      <KV k="Latency">{l.latency} s</KV><KV k="Packet loss">{Math.round(l.packet_loss * 100)}%</KV><KV k="Bandwidth">{l.bandwidth} kbps</KV>
      <KV k="Last report over link">{last ? `${last.received_clock} · ${last.source}` : '—'}</KV>
    </>
  } else {
    const mine = Object.entries(links).filter(([k]) => k.split('-').includes(id))
    const last = reports.find((r) => r.source === id)
    body = <>
      <h4>{id}<span onClick={onClose}>×</span></h4>
      {id === scenario.asset && asset && <KV k="Status">{asset.status}{asset.route ? ` · ${asset.route}` : ''}</KV>}
      {mine.map(([k, l]) => <KV key={k} k={k.replace('-', ' → ')} tone={l.status === 'GOOD' ? 'g' : 'a'}>{l.status}</KV>)}
      {id !== 'HQ' && <KV k="Last report">{last ? `${last.content} (${mmss(last.age)} old)` : 'none received'}</KV>}
    </>
  }
  return <div className="sel">{body}</div>
}
