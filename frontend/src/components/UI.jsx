import { GLOSSARY } from '../lib/format.js'

export const Chip = ({ tone = '', children, title }) => <em className={`chip ${tone}`} title={title}>{children}</em>

export const KV = ({ k, children, tone = '' }) => (
  <div className="kv"><span>{k}</span><b className={tone}>{children}</b></div>
)

export const Panel = ({ title, right, children, className = '' }) => (
  <section className={`pn ${className}`}>
    {(title || right) && <div className="hd"><h3>{title}</h3>{right}</div>}
    {children}
  </section>
)

export const Tip = ({ term, children }) => <span className="tip" data-t={GLOSSARY[term]}>{children}</span>

export const Loading = ({ text = 'Loading…' }) => <div className="spin"><i />{text}</div>

export const Empty = ({ title, children, action }) => (
  <div className="empty"><b style={{ fontSize: 15 }}>{title}</b><p>{children}</p>{action}</div>
)

export const ErrorBox = ({ error, onRetry }) => (
  <div className="err" role="alert">
    <b>{error?.status === 0 ? 'Backend unreachable' : 'Request failed'}</b>
    <p>{error?.message || String(error)}</p>
    {onRetry && <button className="btn" onClick={onRetry}>Retry</button>}
  </div>
)
