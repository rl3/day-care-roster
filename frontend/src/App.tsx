import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TimeEntryPage from './pages/TimeEntryPage'
import StatisticsPage from './pages/StatisticsPage'
import UsersPage from './pages/UsersPage'
import ChildCountPage from './pages/ChildCountPage'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardPage />} />
            <Route path="time-entries" element={<TimeEntryPage />} />
            <Route path="statistics" element={<StatisticsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="child-count" element={<ChildCountPage />} />
          </Route>
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App