import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import TimeEntryList from '../components/TimeEntryList'
import CalendarView from '../components/CalendarView'
import { Calendar, Filter, List, Grid } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { de } from 'date-fns/locale'

const TimeEntryPage: React.FC = () => {
  const { user } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(
    user?.role === 'fachkraft' ? user.id : undefined
  )
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd')

  const canViewAllUsers = user?.role === 'leitung' || user?.role === 'admin'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Zeiterfassung</h1>
        <p className="text-gray-600 mt-2">
          Erfassen Sie Ihre Arbeitszeiten, Urlaub und Kranktage
        </p>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-md">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4" />
              Liste
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1 px-3 py-2 rounded-md text-sm transition-colors ${
                viewMode === 'calendar' 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid className="h-4 w-4" />
              Kalender
            </button>
          </div>

          {/* Monatsnavigation für Liste */}
          {viewMode === 'list' && (
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                ←
              </button>
              <span className="font-medium min-w-[140px] text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: de })}
              </span>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                →
              </button>
            </div>
          )}

          {/* Benutzerfilter für Leitung/Admin */}
          {canViewAllUsers && (
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={selectedUserId || ''}
                onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : undefined)}
                className="form-input min-w-[200px]"
              >
                <option value="">Alle Mitarbeiter</option>
                <option value={user?.id}>Nur meine Einträge</option>
              </select>
            </div>
          )}

          {/* Aktionen */}
          <div className="flex gap-2 ml-auto">
            {viewMode === 'list' && (
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="btn btn-secondary text-sm"
              >
                Aktueller Monat
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'list' ? (
        <TimeEntryList
          startDate={monthStart}
          endDate={monthEnd}
          userId={selectedUserId}
        />
      ) : (
        <CalendarView userId={selectedUserId} />
      )}

      {/* Hinweise */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Hinweise zur Zeiterfassung</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Arbeitszeiten werden in Stunden erfasst (0,25er Schritte = 15 Min)</li>
          <li>• Urlaub, Krankheit etc. werden in Tagen erfasst (0,5 = halber Tag)</li>
          <li>• Vorbereitungsstunden werden automatisch mit Faktor 0,5 berechnet</li>
          <li>• Nach Monatsabschluss können Einträge nur noch von Leitung/Admin geändert werden</li>
        </ul>
      </div>
    </div>
  )
}

export default TimeEntryPage