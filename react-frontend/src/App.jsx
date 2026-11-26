import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import ProtectedRoute from './components/layout/ProtectedRoute.jsx'

import Login           from './pages/Login.jsx'
import Register        from './pages/Register.jsx'
import Dashboard       from './pages/Dashboard.jsx'
import UploadJudgment  from './pages/UploadJudgment.jsx'
import AllCases        from './pages/AllCases.jsx'
import CaseDetails     from './pages/CaseDetails.jsx'
import AISummary       from './pages/AISummary.jsx'
import SimilarJudgments from './pages/SimilarJudgments.jsx'
import HearingCalendar from './pages/HearingCalendar.jsx'
import Profile         from './pages/Profile.jsx'
import NotFound        from './pages/NotFound.jsx'

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard"              element={<Dashboard />} />
            <Route path="/upload"                 element={<UploadJudgment />} />
            <Route path="/cases"                  element={<AllCases />} />
            <Route path="/cases/:id"              element={<CaseDetails />} />
            <Route path="/cases/:id/summary"      element={<AISummary />} />
            <Route path="/cases/:id/similar"      element={<SimilarJudgments />} />
            <Route path="/hearings"               element={<HearingCalendar />} />
            <Route path="/profile"                element={<Profile />} />
          </Route>

          <Route path="/"  element={<Navigate to="/dashboard" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
