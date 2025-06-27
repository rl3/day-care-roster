import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import UserList from '../components/UserList'

const UsersPage: React.FC = () => {
  const { user } = useAuth()

  if (user?.role === 'fachkraft') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Benutzerverwaltung</h1>
          <p className="text-gray-600 mt-2">
            Zugriff nur für Leitung und Administratoren
          </p>
        </div>
        
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          Sie haben keine Berechtigung, diese Seite zu besuchen.
          Nur Benutzer mit der Rolle "Leitung" oder "Admin" können die Benutzerverwaltung verwenden.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Benutzerverwaltung</h1>
        <p className="text-gray-600 mt-2">
          Mitarbeiter verwalten und neue Benutzer anlegen
        </p>
      </div>

      <UserList />
    </div>
  )
}

export default UsersPage