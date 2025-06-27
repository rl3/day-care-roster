import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { statisticsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { TrendingUp, TrendingDown, Clock, Calendar, Users, AlertTriangle } from 'lucide-react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { de } from 'date-fns/locale'

const StatisticsOverview: React.FC = () => {
  const { user } = useAuth()
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())

  const isWeekView = selectedPeriod === 'week'
  const weekStart = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd')
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1

  const { data: weeklyStats, isLoading: weeklyLoading } = useQuery({
    queryKey: ['weeklyStatistics', weekStart],
    queryFn: () => statisticsAPI.getWeeklyStatistics(weekStart),
    enabled: isWeekView
  })

  const { data: monthlyStats, isLoading: monthlyLoading } = useQuery({
    queryKey: ['monthlyStatistics', year, month],
    queryFn: () => statisticsAPI.getMonthlyStatistics(year, month),
    enabled: !isWeekView
  })

  const { data: userAnnualStats, isLoading: annualLoading } = useQuery({
    queryKey: ['userAnnualStatistics', user?.id, year],
    queryFn: () => user ? statisticsAPI.getUserAnnualStatistics(user.id, year) : null,
    enabled: !!user
  })

  const isLoading = weeklyLoading || monthlyLoading || annualLoading
  const currentStats = isWeekView ? weeklyStats : monthlyStats
  const canViewAllUsers = user?.role === 'leitung' || user?.role === 'admin'

  // Filter für eigene Statistiken wenn Fachkraft
  const filteredStats = canViewAllUsers 
    ? currentStats 
    : currentStats?.filter(stat => stat.user_id === user?.id)

  const getOvertimeColor = (overtime: number) => {
    if (overtime > 10) return 'text-red-600'
    if (overtime < -10) return 'text-red-600'
    if (overtime > 0) return 'text-green-600'
    return 'text-gray-600'
  }

  const getOvertimeIcon = (overtime: number) => {
    if (overtime > 0) return <TrendingUp className="h-4 w-4" />
    if (overtime < 0) return <TrendingDown className="h-4 w-4" />
    return <Clock className="h-4 w-4" />
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    if (isWeekView) {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
      setCurrentDate(newDate)
    } else {
      const newDate = new Date(currentDate)
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
      setCurrentDate(newDate)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header mit Navigation */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Arbeitszeit-Statistiken</h2>
            <p className="text-gray-600 text-sm">Übersicht Ihrer Arbeitszeiten und Überstunden</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPeriod('week')}
              className={`btn text-sm ${isWeekView ? 'btn-primary' : 'btn-secondary'}`}
            >
              Woche
            </button>
            <button
              onClick={() => setSelectedPeriod('month')}
              className={`btn text-sm ${!isWeekView ? 'btn-primary' : 'btn-secondary'}`}
            >
              Monat
            </button>
          </div>
        </div>

        {/* Zeitraum Navigation */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            ←
          </button>
          <span className="font-medium min-w-[200px] text-center">
            {isWeekView 
              ? `KW ${format(currentDate, 'w', { locale: de })} - ${format(currentDate, 'yyyy', { locale: de })}`
              : format(currentDate, 'MMMM yyyy', { locale: de })
            }
          </span>
          <button
            onClick={() => navigateDate('next')}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            →
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="btn btn-secondary text-sm ml-4"
          >
            Heute
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* Überstunden-Übersicht */}
          {filteredStats && filteredStats.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {isWeekView ? 'Wöchentliche' : 'Monatliche'} Arbeitszeit-Übersicht
              </h3>
              
              <div className="space-y-4">
                {filteredStats.map((stat) => (
                  <div key={stat.user_id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{stat.user_name}</h4>
                      <div className={`flex items-center gap-1 font-medium ${getOvertimeColor(stat.overtime)}`}>
                        {getOvertimeIcon(stat.overtime)}
                        {stat.overtime > 0 ? '+' : ''}{stat.overtime.toFixed(2)}h
                        {Math.abs(stat.overtime) > 10 && (
                          <AlertTriangle className="h-4 w-4 text-orange-500 ml-1" title="Über 10 Stunden Differenz!" />
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Gearbeitet</div>
                        <div className="font-medium">{stat.total_hours?.toFixed(2) || stat.worked_hours?.toFixed(2)}h</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Soll</div>
                        <div className="font-medium">{stat.target_hours.toFixed(2)}h</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Differenz</div>
                        <div className={`font-medium ${getOvertimeColor(stat.overtime)}`}>
                          {stat.overtime > 0 ? '+' : ''}{stat.overtime.toFixed(2)}h
                        </div>
                      </div>
                    </div>

                    {/* Zusätzliche Monatsinfo */}
                    {!isWeekView && 'sick_days' in stat && (
                      <div className="grid grid-cols-2 gap-4 text-sm mt-3 pt-3 border-t">
                        <div>
                          <div className="text-gray-500">Kranktage</div>
                          <div className="font-medium">{stat.sick_days} Tage</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Urlaubstage</div>
                          <div className="font-medium">{stat.vacation_days} Tage</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Jahresstatistiken für eingeloggten User */}
          {userAnnualStats && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Jahresstatistik {year} - {userAnnualStats.user_name}
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {userAnnualStats.anleitung_hours.toFixed(1)}h
                  </div>
                  <div className="text-sm text-gray-600">Anleitungsstunden</div>
                </div>
                
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {userAnnualStats.fortbildung_days}
                  </div>
                  <div className="text-sm text-gray-600">Fortbildungstage</div>
                </div>
                
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {userAnnualStats.vacation_days}
                  </div>
                  <div className="text-sm text-gray-600">Urlaubstage</div>
                </div>
                
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {userAnnualStats.sick_days}
                  </div>
                  <div className="text-sm text-gray-600">Kranktage</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {userAnnualStats.child_sick_days}
                  </div>
                  <div className="text-sm text-gray-600">Kindkranktage</div>
                </div>
                
                <div className="text-center p-3 bg-indigo-50 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-600">
                    {userAnnualStats.bildungsurlaub_days}
                  </div>
                  <div className="text-sm text-gray-600">Bildungsurlaub</div>
                </div>
                
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {userAnnualStats.vacation_days_previous_year}
                  </div>
                  <div className="text-sm text-gray-600">Resturlaub Vorjahr</div>
                </div>
              </div>
            </div>
          )}

          {/* Hinweise */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-medium text-amber-900 mb-2">Fachkraft-Kind-Schlüssel</h3>
            <div className="text-sm text-amber-800 space-y-1">
              <p>• <strong>Über 3 Jahre:</strong> 1 Pädagoge auf 10 Kinder</p>
              <p>• <strong>Unter 3 Jahre:</strong> 1 Pädagoge auf 4,25 Kinder</p>
              <p>• Vorbereitungsstunden werden mit Faktor 0,5 in die Berechnung einbezogen</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default StatisticsOverview