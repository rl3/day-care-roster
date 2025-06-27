import React from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI } from '../services/api'
import { User } from '../types'
import { UserPlus, Save } from 'lucide-react'

interface UserFormData {
  username: string
  email: string
  full_name: string
  role: 'fachkraft' | 'leitung' | 'admin'
  weekly_hours: number
  additional_hours: number
  work_days_per_week: number
  vacation_days_per_year: number
  password?: string
}

interface UserFormProps {
  onSuccess?: () => void
  editUser?: User
}

const UserForm: React.FC<UserFormProps> = ({ onSuccess, editUser }) => {
  const queryClient = useQueryClient()
  
  const { register, handleSubmit, formState: { errors } } = useForm<UserFormData>({
    defaultValues: {
      username: editUser?.username || '',
      email: editUser?.email || '',
      full_name: editUser?.full_name || '',
      role: editUser?.role || 'fachkraft',
      weekly_hours: editUser?.weekly_hours || 25,
      additional_hours: editUser?.additional_hours || 0,
      work_days_per_week: editUser?.work_days_per_week || 5,
      vacation_days_per_year: editUser?.vacation_days_per_year || 32
    }
  })

  const createMutation = useMutation({
    mutationFn: usersAPI.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onSuccess?.()
    }
  })

  const onSubmit = (data: UserFormData) => {
    if (!editUser) {
      // Neuen Benutzer erstellen
      if (!data.password) {
        alert('Passwort ist erforderlich für neue Benutzer')
        return
      }
      createMutation.mutate({
        ...data,
        password: data.password
      })
    }
    // TODO: Update-Funktionalität für bestehende Benutzer
  }

  const isLoading = createMutation.isPending

  // Vordefinierte Mitarbeiter-Konfigurationen
  const presetConfigs = [
    { name: 'Leitung', weekly_hours: 30, additional_hours: 14.1875, work_days: 5, vacation: 32 },
    { name: 'Fachkraft A', weekly_hours: 26, additional_hours: 2, work_days: 5, vacation: 32 },
    { name: 'Fachkraft B', weekly_hours: 22, additional_hours: 0, work_days: 4, vacation: 26 },
    { name: 'Fachkraft C', weekly_hours: 20, additional_hours: 1, work_days: 3, vacation: 19 },
    { name: 'Fachkraft D', weekly_hours: 25, additional_hours: 3, work_days: 5, vacation: 32 },
    { name: 'Fachkraft E', weekly_hours: 24, additional_hours: 2, work_days: 4, vacation: 26 },
    { name: 'Fachkraft F', weekly_hours: 23, additional_hours: 0, work_days: 5, vacation: 32 },
    { name: 'FSJ', weekly_hours: 37.5, additional_hours: 0, work_days: 5, vacation: 32 }
  ]

  const applyPreset = (preset: typeof presetConfigs[0]) => {
    const setValue = (field: keyof UserFormData, value: any) => {
      const input = document.querySelector(`[name="${field}"]`) as HTMLInputElement
      if (input) {
        input.value = value.toString()
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
    
    setValue('weekly_hours', preset.weekly_hours)
    setValue('additional_hours', preset.additional_hours)
    setValue('work_days_per_week', preset.work_days)
    setValue('vacation_days_per_year', preset.vacation)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="h-5 w-5 text-primary-600" />
        <h2 className="text-lg font-medium text-gray-900">
          {editUser ? 'Benutzer bearbeiten' : 'Neuen Benutzer anlegen'}
        </h2>
      </div>

      {/* Schnellkonfiguration */}
      {!editUser && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Schnellkonfiguration</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {presetConfigs.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset)}
                className="text-xs p-2 bg-blue-100 hover:bg-blue-200 rounded text-blue-800 transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Grunddaten */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 border-b pb-2">Grunddaten</h3>
          
          <div>
            <label className="form-label">Benutzername</label>
            <input
              type="text"
              className="form-input"
              {...register('username', { 
                required: 'Benutzername ist erforderlich',
                minLength: { value: 3, message: 'Mindestens 3 Zeichen' }
              })}
            />
            {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>}
          </div>

          <div>
            <label className="form-label">E-Mail</label>
            <input
              type="email"
              className="form-input"
              {...register('email', { 
                required: 'E-Mail ist erforderlich',
                pattern: { value: /^\S+@\S+$/i, message: 'Ungültige E-Mail-Adresse' }
              })}
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="form-label">Vollständiger Name</label>
            <input
              type="text"
              className="form-input"
              {...register('full_name', { required: 'Name ist erforderlich' })}
            />
            {errors.full_name && <p className="text-red-500 text-sm mt-1">{errors.full_name.message}</p>}
          </div>

          <div>
            <label className="form-label">Rolle</label>
            <select
              className="form-input"
              {...register('role', { required: 'Rolle ist erforderlich' })}
            >
              <option value="fachkraft">Fachkraft</option>
              <option value="leitung">Leitung</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {!editUser && (
            <div>
              <label className="form-label">Passwort</label>
              <input
                type="password"
                className="form-input"
                {...register('password', { 
                  required: !editUser ? 'Passwort ist erforderlich' : false,
                  minLength: { value: 6, message: 'Mindestens 6 Zeichen' }
                })}
              />
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
            </div>
          )}
        </div>

        {/* Arbeitszeit-Konfiguration */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 border-b pb-2">Arbeitszeit-Konfiguration</h3>
          
          <div>
            <label className="form-label">Wochenstunden</label>
            <input
              type="number"
              step="0.25"
              min="0"
              max="40"
              className="form-input"
              {...register('weekly_hours', { 
                required: 'Wochenstunden sind erforderlich',
                min: { value: 0, message: 'Muss positiv sein' },
                max: { value: 40, message: 'Maximal 40 Stunden' }
              })}
            />
            {errors.weekly_hours && <p className="text-red-500 text-sm mt-1">{errors.weekly_hours.message}</p>}
          </div>

          <div>
            <label className="form-label">Sonderstunden (Leitung, Anleitung, etc.)</label>
            <input
              type="number"
              step="0.25"
              min="0"
              max="20"
              className="form-input"
              {...register('additional_hours', { 
                min: { value: 0, message: 'Muss positiv sein' },
                max: { value: 20, message: 'Maximal 20 Stunden' }
              })}
            />
            {errors.additional_hours && <p className="text-red-500 text-sm mt-1">{errors.additional_hours.message}</p>}
          </div>

          <div>
            <label className="form-label">Arbeitstage pro Woche</label>
            <select
              className="form-input"
              {...register('work_days_per_week', { required: 'Arbeitstage sind erforderlich' })}
            >
              <option value="3">3 Tage</option>
              <option value="4">4 Tage</option>
              <option value="5">5 Tage</option>
            </select>
          </div>

          <div>
            <label className="form-label">Urlaubstage pro Jahr</label>
            <input
              type="number"
              min="15"
              max="40"
              className="form-input"
              {...register('vacation_days_per_year', { 
                required: 'Urlaubstage sind erforderlich',
                min: { value: 15, message: 'Mindestens 15 Tage' },
                max: { value: 40, message: 'Maximal 40 Tage' }
              })}
            />
            {errors.vacation_days_per_year && <p className="text-red-500 text-sm mt-1">{errors.vacation_days_per_year.message}</p>}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isLoading ? 'Speichert...' : editUser ? 'Aktualisieren' : 'Benutzer anlegen'}
        </button>
      </div>

      {/* Fehler anzeigen */}
      {createMutation.error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          Fehler beim Speichern: {(createMutation.error as any)?.response?.data?.detail || 'Unbekannter Fehler'}
        </div>
      )}

      {/* Erfolg anzeigen */}
      {createMutation.isSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
          Benutzer erfolgreich angelegt!
        </div>
      )}
    </form>
  )
}

export default UserForm