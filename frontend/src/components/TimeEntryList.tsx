import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { timeEntriesAPI } from '../services/api'
import { TimeEntry } from '../types'
import { Edit2, Trash2, Clock, Calendar, Lock } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import TimeEntryForm from './TimeEntryForm'

interface TimeEntryListProps {
  startDate?: string
  endDate?: string
  userId?: number
}

const TimeEntryList: React.FC<TimeEntryListProps> = ({ startDate, endDate, userId }) => {
  const queryClient = useQueryClient()
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['timeEntries', { startDate, endDate, userId }],
    queryFn: () => timeEntriesAPI.getTimeEntries({ start_date: startDate, end_date: endDate, user_id: userId })
  })

  const deleteMutation = useMutation({
    mutationFn: timeEntriesAPI.deleteTimeEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeEntries'] })
    }
  })

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'arbeitszeit': 'Arbeitszeit',
      'krank': 'Krank',
      'kindkrank': 'Kindkrank',
      'urlaub': 'Urlaub',
      'bildungsurlaub': 'Bildungsurlaub',
      'hospitation': 'Hospitation',
      'praktikum': 'Praktikum'
    }
    return labels[type] || type
  }

  const getSubtypeLabel = (subtype?: string) => {
    const labels: Record<string, string> = {
      'stunden_am_kind': 'Stunden am Kind',
      'vorbereitungsstunden': 'Vorbereitung',
      'elterngespraech': 'Elterngespräch',
      'konferenz': 'Konferenz',
      'kleinteam': 'Kleinteam',
      'anleitung': 'Anleitung',
      'leitung': 'Leitung',
      'geschaeftsfuehrung': 'Geschäftsführung',
      'sprachfoerderung': 'Sprachförderung',
      'fortbildung': 'Fortbildung',
      'teamentwicklung': 'Teamentwicklung'
    }
    return subtype ? labels[subtype] || subtype : ''
  }

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry)
    setShowForm(true)
  }

  const handleDelete = (id: number) => {
    if (window.confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingEntry(null)
  }

  if (showForm) {
    return (
      <div>
        <button
          onClick={() => {
            setShowForm(false)
            setEditingEntry(null)
          }}
          className="btn btn-secondary mb-4"
        >
          ← Zurück zur Liste
        </button>
        <TimeEntryForm
          editEntry={editingEntry || undefined}
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Zeiteinträge</h2>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
        >
          + Neuer Eintrag
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Noch keine Zeiteinträge vorhanden</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary mt-4"
          >
            Ersten Eintrag erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`bg-white rounded-lg shadow-sm border p-4 ${
                entry.is_locked ? 'bg-gray-50 border-gray-300' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">
                      {format(new Date(entry.date), 'dd.MM.yyyy', { locale: de })}
                    </span>
                    {entry.is_locked && (
                      <Lock className="h-4 w-4 text-gray-400" title="Gesperrt" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="font-medium text-primary-600">
                      {getTypeLabel(entry.entry_type)}
                    </span>
                    
                    {entry.subtype && (
                      <span>{getSubtypeLabel(entry.subtype)}</span>
                    )}
                    
                    {entry.hours > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {entry.hours}h
                      </span>
                    )}
                    
                    {entry.days > 0 && (
                      <span>
                        {entry.days === 0.5 ? 'Halber Tag' : `${entry.days} Tag${entry.days > 1 ? 'e' : ''}`}
                      </span>
                    )}
                  </div>
                  
                  {entry.description && (
                    <p className="text-sm text-gray-500 mt-2">{entry.description}</p>
                  )}
                </div>
                
                {!entry.is_locked && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(entry)}
                      className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                      title="Bearbeiten"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Löschen"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TimeEntryList