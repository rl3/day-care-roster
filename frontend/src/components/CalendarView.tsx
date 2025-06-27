import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { timeEntriesAPI } from '../services/api'
import { TimeEntry } from '../types'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday,
  startOfWeek,
  endOfWeek
} from 'date-fns'
import { de } from 'date-fns/locale'
import TimeEntryForm from './TimeEntryForm'

interface CalendarViewProps {
  userId?: number
}

const CalendarView: React.FC<CalendarViewProps> = ({ userId }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showForm, setShowForm] = useState(false)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const { data: entries = [] } = useQuery({
    queryKey: ['timeEntries', format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd'), userId],
    queryFn: () => timeEntriesAPI.getTimeEntries({
      start_date: format(monthStart, 'yyyy-MM-dd'),
      end_date: format(monthEnd, 'yyyy-MM-dd'),
      user_id: userId
    })
  })

  const getEntriesForDate = (date: Date): TimeEntry[] => {
    return entries.filter(entry => 
      isSameDay(new Date(entry.date), date)
    )
  }

  const getEntryTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'arbeitszeit': 'bg-blue-100 text-blue-800',
      'krank': 'bg-red-100 text-red-800',
      'kindkrank': 'bg-orange-100 text-orange-800',
      'urlaub': 'bg-green-100 text-green-800',
      'bildungsurlaub': 'bg-purple-100 text-purple-800',
      'hospitation': 'bg-yellow-100 text-yellow-800',
      'praktikum': 'bg-indigo-100 text-indigo-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const getEntryTypeShort = (type: string) => {
    const shorts: Record<string, string> = {
      'arbeitszeit': 'ARB',
      'krank': 'KR',
      'kindkrank': 'KKR',
      'urlaub': 'URL',
      'bildungsurlaub': 'BU',
      'hospitation': 'HOS',
      'praktikum': 'PRA'
    }
    return shorts[type] || type.substring(0, 3).toUpperCase()
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setShowForm(true)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setSelectedDate(null)
  }

  if (showForm && selectedDate) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setShowForm(false)
              setSelectedDate(null)
            }}
            className="btn btn-secondary"
          >
            ← Zurück zum Kalender
          </button>
          <h3 className="text-lg font-medium">
            Eintrag für {format(selectedDate, 'dd.MM.yyyy', { locale: de })}
          </h3>
        </div>
        
        <TimeEntryForm
          onSuccess={handleFormSuccess}
          editEntry={{
            id: 0,
            user_id: 0,
            date: format(selectedDate, 'yyyy-MM-dd'),
            entry_type: 'arbeitszeit',
            hours: 0,
            days: 0,
            is_locked: false
          }}
        />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Kalender Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-medium text-gray-900">Kalenderansicht</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <span className="font-medium min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: de })}
          </span>
          
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="btn btn-secondary text-sm ml-4"
          >
            Heute
          </button>
        </div>
      </div>

      {/* Wochentage Header */}
      <div className="grid grid-cols-7 border-b">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
          <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 border-r last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Kalendertage */}
      <div className="grid grid-cols-7">
        {days.map((day, dayIdx) => {
          const dayEntries = getEntriesForDate(day)
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const isTodayDate = isToday(day)

          return (
            <div
              key={day.toString()}
              className={`min-h-[100px] p-2 border-r border-b last:border-r-0 cursor-pointer hover:bg-gray-50 ${
                !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
              } ${isSelected ? 'bg-primary-50' : ''} ${isTodayDate ? 'bg-blue-50' : ''}`}
              onClick={() => isCurrentMonth && handleDateClick(day)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium ${
                  isTodayDate ? 'text-primary-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {format(day, 'd')}
                </span>
                
                {isCurrentMonth && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDateClick(day)
                    }}
                    className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eintrag hinzufügen"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Einträge für den Tag */}
              <div className="space-y-1">
                {dayEntries.slice(0, 3).map((entry, idx) => (
                  <div
                    key={entry.id}
                    className={`text-xs px-1 py-0.5 rounded truncate ${getEntryTypeColor(entry.entry_type)}`}
                    title={`${getEntryTypeShort(entry.entry_type)}: ${
                      entry.hours > 0 ? `${entry.hours}h` : 
                      entry.days > 0 ? `${entry.days === 0.5 ? '½' : entry.days} Tag${entry.days > 1 ? 'e' : ''}` : ''
                    }`}
                  >
                    {getEntryTypeShort(entry.entry_type)}
                    {entry.hours > 0 && ` ${entry.hours}h`}
                    {entry.days > 0 && ` ${entry.days === 0.5 ? '½' : entry.days}d`}
                  </div>
                ))}
                
                {dayEntries.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{dayEntries.length - 3} weitere
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legende */}
      <div className="p-4 border-t bg-gray-50">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Legende</h4>
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries({
            'arbeitszeit': 'Arbeitszeit',
            'krank': 'Krank',
            'urlaub': 'Urlaub',
            'kindkrank': 'Kindkrank',
            'bildungsurlaub': 'Bildungsurlaub'
          }).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded ${getEntryTypeColor(type).split(' ')[0]}`}></div>
              <span>{label} ({getEntryTypeShort(type)})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CalendarView