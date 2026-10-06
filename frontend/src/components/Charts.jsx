// Minimal SVG charts. They render exactly the numbers they are given.
export function Bars({ rows, color = '#2c6a9c', fmt = (v) => v }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return rows.map((r) => (
    <div className="bar" key={r.label}><span title={r.label}>{r.label}</span><div><i style={{ width: `${(r.value / max) * 100}%`, background: color }} /></div><b>{fmt(r.value)}</b></div>
  ))
}

export function GroupedBars({ series, keys }) {
  const w = 560, h = 190, pad = 28
  const all = series.flatMap((s) => keys.map((k) => s[k.key]))
  const max = Math.max(1, ...all), min = Math.min(0, ...all)
  const y = (v) => pad + (1 - (v - min) / (max - min)) * (h - 2 * pad)
  const gw = (w - 2 * pad) / Math.max(series.length, 1), bw = Math.min(22, (gw - 6) / keys.length)
  return (
    <svg className="ch" viewBox={`0 0 ${w} ${h}`} width="100%">
      <line x1={pad} x2={w - pad} y1={y(0)} y2={y(0)} stroke="#20303C" />
      <text x={4} y={y(max) + 3}>{max}</text><text x={4} y={y(0) + 3}>0</text>
      {series.map((s, i) => (
        <g key={s.mission_id} transform={`translate(${pad + i * gw + gw / 2 - (bw * keys.length) / 2},0)`}>
          {keys.map((k, j) => <rect key={k.key} x={j * bw} y={Math.min(y(s[k.key]), y(0))} width={bw - 2} height={Math.abs(y(s[k.key]) - y(0))} fill={k.color}><title>{`${k.label}: ${s[k.key]}`}</title></rect>)}
          <text x={(bw * keys.length) / 2} y={h - 8} textAnchor="middle">#{s.mission_id}</text>
        </g>
      ))}
    </svg>
  )
}
