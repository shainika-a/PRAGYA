import { useEffect, useState } from 'react'
import { api } from '../api.js'

export function useHealth() {
  const [ok, setOk] = useState(null)
  useEffect(() => {
    let live = true
    const ping = () => api.health().then(() => live && setOk(true), () => live && setOk(false))
    ping()
    const t = setInterval(ping, 8000)
    return () => { live = false; clearInterval(t) }
  }, [])
  return ok
}

export default function TopBar({ title, subtitle, children }) {
  const ok = useHealth()
  return (
    <header className="top">
      <span className="ttl">{title}</span>
      {subtitle && <><span className="sep" /><span className="sub">{subtitle}</span></>}
      <span className="grow" />
      {children}
      <span className="sep" />
      <span className="sub" title="FastAPI backend health">
        <i className={`dot ${ok == null ? '' : ok ? 'g' : 'r'}`} />{ok == null ? 'Checking…' : ok ? 'Backend online' : 'Backend offline'}
      </span>
    </header>
  )
}
