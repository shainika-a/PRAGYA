import { useEffect, useState } from 'react'

// Tiny hash router: #/page or #/page/<missionId>
function parse() {
  const [page, id] = window.location.hash.replace(/^#\/?/, '').split('/')
  return { page: page || 'dashboard', id: id ? Number(id) : null }
}

export function useRoute() {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const on = () => setRoute(parse())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export const go = (path) => { window.location.hash = `#/${path}` }
