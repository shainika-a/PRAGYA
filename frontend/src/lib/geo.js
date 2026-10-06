// Map geometry helpers. Scenario map coordinates are on a 0-100 grid; the SVG is 170 x 100.
export const W = 170
export const H = 100
export const px = ([x, y]) => [x * 1.7, y]

export function pointAt(path, frac) {
  const pts = path.map(px)
  const seg = []
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    seg.push(d)
    total += d
  }
  let rem = Math.min(1, Math.max(0, frac)) * total
  for (let i = 0; i < seg.length; i++) {
    if (rem <= seg[i] || i === seg.length - 1) {
      const k = seg[i] ? Math.min(1, rem / seg[i]) : 0
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]
    }
    rem -= seg[i]
  }
  return pts[0]
}

// Which map route belongs to a committing action: the n-th commit action uses the n-th route that starts at the asset.
export function routeKeyForAction(scn, actionKey) {
  const base = scn.map.entities[scn.asset]
  if (!base) return null
  const commits = Object.entries(scn.actions).filter(([, a]) => a.kind === 'commit').map(([k]) => k)
  const routes = Object.entries(scn.map.routes || {}).filter(([, p]) => p[0][0] === base[0] && p[0][1] === base[1]).map(([k]) => k)
  const i = commits.indexOf(actionKey)
  return i >= 0 ? routes[i] ?? null : null
}

export function routeKeyForLabel(scn, label) {
  const hit = Object.entries(scn.actions).find(([, a]) => a.label === label)
  return hit ? routeKeyForAction(scn, hit[0]) : null
}

// Where the moving asset is right now, derived from backend asset state (start_tick, travel, since).
export function assetPosition(scn, asset, tick) {
  const base = px(scn.map.entities[scn.asset])
  if (!asset || asset.start_tick == null) return base
  const key = routeKeyForLabel(scn, asset.route)
  const path = key && scn.map.routes[key]
  if (!path) return base
  const end = asset.status === 'MOVING' ? tick : asset.status === 'ARRIVED' ? asset.start_tick + asset.travel : asset.since
  return pointAt(path, (end - asset.start_tick) / asset.travel)
}
