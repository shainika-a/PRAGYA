import { useRoute } from './lib/router.js'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Scenarios from './pages/Scenarios.jsx'
import Training from './pages/Training.jsx'
import AAR from './pages/AAR.jsx'
import Replay from './pages/Replay.jsx'
import Analytics from './pages/Analytics.jsx'

const PAGES = { dashboard: Dashboard, scenarios: Scenarios, training: Training, aar: AAR, replay: Replay, analytics: Analytics }

export default function App() {
  const { page, id } = useRoute()
  const Page = PAGES[page] || Dashboard
  return (
    <div className="app">
      <Sidebar page={PAGES[page] ? page : 'dashboard'} />
      <main className="main"><Page id={id} /></main>
    </div>
  )
}
