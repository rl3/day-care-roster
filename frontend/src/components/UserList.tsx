import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { usersAPI } from '../services/api'
import { User } from '../types'
import { Users, Edit2, Clock, Calendar, Mail, Shield, Trash2 } from 'lucide-react'
import UserForm from './UserForm'

const UserList: React.FC = () => {
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const queryClient = useQueryClient()

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: usersAPI.getAllUsers
  })

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      'fachkraft': 'Fachkraft',
      'leitung': 'Leitung',
      'admin': 'Administrator'
    }
    return labels[role] || role
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'fachkraft': 'bg-blue-100 text-blue-800',
      'leitung': 'bg-green-100 text-green-800',
      'admin': 'bg-purple-100 text-purple-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingUser(null)
  }

  const handleDelete = async (user: User) => {
    if (window.confirm(`Möchten Sie den Benutzer "${user.full_name}" wirklich löschen?`)) {
      try {
        await usersAPI.deleteUser(user.id)
        queryClient.invalidateQueries({ queryKey: ['users'] })
      } catch (error) {
        alert('Fehler beim Löschen des Benutzers: ' + (error as any)?.response?.data?.detail || 'Unbekannter Fehler')
      }
    }
  }

  if (showForm) {
    return (
      <div>
        <button
          onClick={() => {
            setShowForm(false)
            setEditingUser(null)
          }}
          className="btn btn-secondary mb-4"
        >
          ← Zurück zur Benutzerliste
        </button>
        <UserForm
          editUser={editingUser || undefined}
          onSuccess={handleFormSuccess}
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
        Fehler beim Laden der Benutzer: {(error as any)?.message}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Benutzer ({users.length})
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
        >
          + Neuer Benutzer
        </button>
      </div>

      {users.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Noch keine Benutzer vorhanden</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary mt-4"
          >
            Ersten Benutzer anlegen
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{user.full_name}</h3>
                  <p className="text-sm text-gray-500">@{user.username}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                    {getRoleLabel(user.role)}
                  </span>
                  
                  <button
                    onClick={() => handleEdit(user)}
                    className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                    title="Bearbeiten"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(user)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-3 w-3" />
                  <span>{user.email}</span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="h-3 w-3" />
                  <span>{user.weekly_hours}h + {user.additional_hours}h Sonder/Woche</span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-3 w-3" />
                  <span>{user.work_days_per_week} Tage/Woche, {user.vacation_days_per_year} Urlaubstage/Jahr</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Shield className="h-3 w-3" />
                  <span>
                    {user.is_active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </div>
                
                <div className="text-xs text-gray-500">
                  ID: {user.id}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Informationen */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Benutzerrollen</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• <strong>Fachkraft:</strong> Kann nur eigene Zeiterfassungen einsehen und bearbeiten</p>
          <p>• <strong>Leitung:</strong> Kann alle Zeiterfassungen einsehen und bearbeiten</p>
          <p>• <strong>Administrator:</strong> Vollzugriff inkl. Benutzerverwaltung und Systemkonfiguration</p>
        </div>
      </div>
    </div>
  )
}

export default UserList