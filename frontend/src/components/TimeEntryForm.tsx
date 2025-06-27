import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { timeEntriesAPI } from '../services/api'
import { TimeEntry } from '../types'
import { Calendar, Clock, FileText } from 'lucide-react'

interface TimeEntryFormData {
  date: string
  entry_type: 'arbeitszeit' | 'krank' | 'kindkrank' | 'urlaub' | 'bildungsurlaub' | 'hospitation' | 'praktikum'
  subtype?: string
  hours: number
  days: number
  description?: string
}

interface TimeEntryFormProps {
  onSuccess?: () => void
  editEntry?: TimeEntry
}

const ENTRY_TYPES = [
  { value: 'arbeitszeit', label: 'Arbeitszeit' },
  { value: 'krank', label: 'Krank' },
  { value: 'kindkrank', label: 'Kindkrank' },
  { value: 'urlaub', label: 'Urlaub' },
  { value: 'bildungsurlaub', label: 'Bildungsurlaub' },
  { value: 'hospitation', label: 'Hospitation' },
  { value: 'praktikum', label: 'Praktikum' }
]

const WORK_SUBTYPES = [
  { value: 'stunden_am_kind', label: 'Stunden am Kind' },
  { value: 'vorbereitungsstunden', label: 'Vorbereitungsstunden (Faktor 0,5)' },
  { value: 'elterngespraech', label: 'Elterngespräch' },
  { value: 'konferenz', label: 'Konferenz' },
  { value: 'kleinteam', label: 'Kleinteam' },
  { value: 'anleitung', label: 'Anleitung' },
  { value: 'leitung', label: 'Leitung' },
  { value: 'geschaeftsfuehrung', label: 'Geschäftsführung' },
  { value: 'sprachfoerderung', label: 'Sprachförderung' },
  { value: 'fortbildung', label: 'Fortbildung' },
  { value: 'teamentwicklung', label: 'Teamentwicklung' }
]

const TimeEntryForm: React.FC<TimeEntryFormProps> = ({ onSuccess, editEntry }) => {
  const queryClient = useQueryClient()
  const [selectedType, setSelectedType] = useState<string>(editEntry?.entry_type || 'arbeitszeit')
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<TimeEntryFormData>({
    defaultValues: {
      date: editEntry?.date || new Date().toISOString().split('T')[0],
      entry_type: editEntry?.entry_type || 'arbeitszeit',
      subtype: editEntry?.subtype || '',
      hours: editEntry?.hours || 0,
      days: editEntry?.days || 0,
      description: editEntry?.description || ''
    }
  })

  const createMutation = useMutation({
    mutationFn: timeEntriesAPI.createTimeEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] })
      onSuccess?.()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Omit<TimeEntry, 'id' | 'user_id' | 'is_locked'> }) =>
      timeEntriesAPI.updateTimeEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] })
      onSuccess?.()
    }
  })

  const entryType = watch('entry_type')
  const isWorkTime = entryType === 'arbeitszeit'
  const isDayBased = ['krank', 'kindkrank', 'urlaub', 'bildungsurlaub', 'hospitation', 'praktikum'].includes(entryType)

  const onSubmit = (data: TimeEntryFormData) => {
    const entryData = {
      date: data.date,
      entry_type: data.entry_type,
      subtype: isWorkTime ? data.subtype : undefined,
      hours: isWorkTime ? data.hours : 0,
      days: isDayBased ? data.days : 0,
      description: data.description || undefined
    }

    if (editEntry) {
      updateMutation.mutate({ id: editEntry.id, data: entryData })
    } else {
      createMutation.mutate(entryData)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-primary-600" />
        <h2 className="text-lg font-medium text-gray-900">
          {editEntry ? 'Zeiteintrag bearbeiten' : 'Neuer Zeiteintrag'}
        </h2>
      </div>

      {/* Datum */}
      <div>
        <label className="form-label">
          <Calendar className="inline h-4 w-4 mr-1" />
          Datum
        </label>
        <input
          type="date"
          className="form-input"
          {...register('date', { required: 'Datum ist erforderlich' })}
        />
        {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
      </div>

      {/* Erfassungsart */}
      <div>
        <label className="form-label">Erfassungsart</label>
        <select
          className="form-input"
          {...register('entry_type', { required: 'Erfassungsart ist erforderlich' })}
          onChange={(e) => {
            setSelectedType(e.target.value)
            setValue('entry_type', e.target.value as any)
            setValue('hours', 0)
            setValue('days', 0)
            setValue('subtype', '')
          }}
        >
          {ENTRY_TYPES.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {/* Unterart für Arbeitszeit */}
      {isWorkTime && (
        <div>
          <label className="form-label">Tätigkeitsart</label>
          <select
            className="form-input"
            {...register('subtype', { required: isWorkTime ? 'Tätigkeitsart ist erforderlich' : false })}
          >
            <option value="">Bitte wählen...</option>
            {WORK_SUBTYPES.map(subtype => (
              <option key={subtype.value} value={subtype.value}>
                {subtype.label}
              </option>
            ))}
          </select>
          {errors.subtype && <p className="text-red-500 text-sm mt-1">{errors.subtype.message}</p>}
        </div>
      )}

      {/* Stunden für Arbeitszeit */}
      {isWorkTime && (
        <div>
          <label className="form-label">Stunden</label>
          <input
            type="number"
            step="0.25"
            min="0"
            max="24"
            className="form-input"
            {...register('hours', { 
              required: isWorkTime ? 'Stunden sind erforderlich' : false,
              min: { value: 0, message: 'Stunden müssen positiv sein' },
              max: { value: 24, message: 'Maximal 24 Stunden pro Tag' }
            })}
          />
          {errors.hours && <p className="text-red-500 text-sm mt-1">{errors.hours.message}</p>}
          <p className="text-gray-500 text-sm mt-1">In 0,25er Schritten (15 Min)</p>
        </div>
      )}

      {/* Tage für andere Erfassungsarten */}
      {isDayBased && (
        <div>
          <label className="form-label">Tage</label>
          <select
            className="form-input"
            {...register('days', { required: isDayBased ? 'Tage sind erforderlich' : false })}
          >
            <option value="0">Bitte wählen...</option>
            <option value="0.5">Halber Tag</option>
            <option value="1">Ganzer Tag</option>
          </select>
          {errors.days && <p className="text-red-500 text-sm mt-1">{errors.days.message}</p>}
        </div>
      )}

      {/* Beschreibung */}
      <div>
        <label className="form-label">
          <FileText className="inline h-4 w-4 mr-1" />
          Notiz (optional)
        </label>
        <textarea
          rows={3}
          className="form-input"
          placeholder="Zusätzliche Informationen..."
          {...register('description')}
        />
      </div>

      {/* Submit Button */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary flex-1 disabled:opacity-50"
        >
          {isLoading ? 'Speichert...' : editEntry ? 'Aktualisieren' : 'Speichern'}
        </button>
      </div>

      {/* Fehler anzeigen */}
      {(createMutation.error || updateMutation.error) && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          Fehler beim Speichern: {(createMutation.error as any)?.message || (updateMutation.error as any)?.message}
        </div>
      )}
    </form>
  )
}

export default TimeEntryForm