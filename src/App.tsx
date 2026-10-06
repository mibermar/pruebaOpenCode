import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { RequireAuth, RequireGuest } from './components/RequireAuth'
import Adoptions from './pages/Adoptions'
import BirdDetail from './pages/BirdDetail'
import Dashboard from './pages/Dashboard'
import Feed from './pages/Feed'
import Login from './pages/Login'
import Matches from './pages/Matches'
import NotFound from './pages/NotFound'
import Profile from './pages/Profile'
import Register from './pages/Register'
import { AppProvider } from './store/AppProvider'

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          {/* invititos */}
          <Route element={<RequireGuest />}>
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
          </Route>

          {/* sesión iniciada + navbar */}
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Feed />} />
              <Route path="/pajarito/:id" element={<BirdDetail />} />
              <Route path="/perfil" element={<Profile />} />
            </Route>
          </Route>

          <Route element={<RequireAuth role="adoptante" />}>
            <Route element={<Layout />}>
              <Route path="/matches" element={<Matches />} />
              <Route path="/adopciones" element={<Adoptions />} />
            </Route>
          </Route>

          <Route element={<RequireAuth role="protectora" />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  )
}
