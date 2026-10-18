import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LangProvider } from './context/LangContext'
import StormAlert      from './pages/family/StormAlert'
import GuidedWalk      from './pages/family/GuidedWalk'
import ProtectionPlan  from './pages/family/ProtectionPlan'
import ClaimTracker    from './pages/family/ClaimTracker'
import Dossier         from './pages/adjuster/Dossier'

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"                 element={<StormAlert />} />
          <Route path="/walk"             element={<GuidedWalk />} />
          <Route path="/protection-plan"  element={<ProtectionPlan />} />
          <Route path="/claim"            element={<ClaimTracker />} />
          <Route path="/adjuster"         element={<Dossier />} />
          <Route path="*"                 element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </LangProvider>
  )
}
