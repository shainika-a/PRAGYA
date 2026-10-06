import { go } from '../lib/router.js'

const ICONS = {
  dashboard: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
  scenarios: <><path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="m3 13 9 5 9-5" /></>,
  training: <><circle cx="12" cy="12" r="8" /><path d="M12 2v5M12 17v5M2 12h5M17 12h5" /></>,
  aar: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4h6v3H9zM9 12h6M9 16h4" /></>,
  replay: <><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4Z" /></>,
  analytics: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
}
const NAV = [['dashboard', 'Dashboard'], ['scenarios', 'Scenarios'], ['training', 'Training'], ['aar', 'AAR'], ['replay', 'Replay'], ['analytics', 'Analytics']]

export default function Sidebar({ page }) {
  return (
    <nav className="side" aria-label="Primary">
      <div className="brand">PRAGYA<small>DECISION TRAINING</small></div>
      {NAV.map(([id, label]) => (
        <a key={id} className={page === id ? 'on' : ''} href={`#/${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>
          <svg viewBox="0 0 24 24">{ICONS[id]}</svg>{label}
        </a>
      ))}
      <div className="foot">v1.0</div>
    </nav>
  )
}
