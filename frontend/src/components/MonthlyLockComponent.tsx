import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Lock, Unlock, Calendar, AlertTriangle, CheckCircle, X } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

const MonthlyLockComponent: React.FC = () => {
  const { user, token } = useAuth()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [monthStatus, setMonthStatus] = useState<'open' | 'locked' | 'loading'>('loading')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const canLockMonths = user?.role === 'leitung' || user?.role === 'admin'

  const API_BASE = import.meta.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000'

  const fetchMonthStatus = async () => {
    if (!token) return
    
    try {
      setMonthStatus('loading')
      const response = await fetch(`${API_BASE}/api/monthly-locks/status/${selectedYear}/${selectedMonth}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMonthStatus(data.is_locked ? 'locked' : 'open')
      } else {
        setMonthStatus('open')
      }
    } catch (error) {
      console.error('Error fetching month status:', error)
      setMonthStatus('open')
    }
  }

  useEffect(() => {
    fetchMonthStatus()
  }, [selectedYear, selectedMonth, token])

  const handleMonthLock = async () => {
    if (!canLockMonths || !token) return
    
    const confirmMessage = `Möchten Sie den Monat ${format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: de })} wirklich abschließen?\n\nNach dem Abschluss können Fachkräfte ihre Zeiteinträge für diesen Monat nicht mehr bearbeiten.`
    
    if (!window.confirm(confirmMessage)) return
    
    setIsProcessing(true)
    setMessage(null)
    
    try {
      const response = await fetch(`${API_BASE}/api/monthly-locks/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          year: selectedYear,
          month: selectedMonth
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessage({ type: 'success', text: `Monat ${format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: de })} wurde erfolgreich abgeschlossen. ${data.locked_entries_count} Zeiteinträge wurden gesperrt.` })
        setMonthStatus('locked')
      } else {
        const errorData = await response.json()
        setMessage({ type: 'error', text: errorData.detail || 'Fehler beim Abschließen des Monats' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Netzwerkfehler beim Abschließen des Monats' })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMonthUnlock = async () => {
    if (!canLockMonths || !token || monthStatus !== 'locked') return
    
    const confirmMessage = `Möchten Sie den Monat ${format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: de })} wieder freigeben?\n\nFachkräfte können dann ihre Zeiteinträge wieder bearbeiten.`
    
    if (!window.confirm(confirmMessage)) return
    
    setIsProcessing(true)
    setMessage(null)
    
    try {
      const response = await fetch(`${API_BASE}/api/monthly-locks/${selectedYear}/${selectedMonth}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessage({ type: 'success', text: `Monat ${format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: de })} wurde wieder freigegeben. ${data.unlocked_entries_count} Zeiteinträge sind wieder bearbeitbar.` })
        setMonthStatus('open')
      } else {
        const errorData = await response.json()
        setMessage({ type: 'error', text: errorData.detail || 'Fehler beim Freigeben des Monats' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Netzwerkfehler beim Freigeben des Monats' })
    } finally {
      setIsProcessing(false)
    }
  }

  if (!canLockMonths) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Lock className="h-5 w-5" />
          <span>Monatsabschluss nur für Leitung und Administratoren verfügbar</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="h-5 w-5 text-primary-600" />
        <h2 className="text-lg font-medium text-gray-900">Monatsabschluss</h2>
      </div>

      {/* Monat auswählen */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="form-label">Jahr</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="form-input"
            disabled={isProcessing}
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - 2 + i
              return (
                <option key={year} value={year}>{year}</option>
              )
            })}
          </select>
        </div>

        <div>
          <label className="form-label">Monat</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="form-input"
            disabled={isProcessing}
          >
            {Array.from({ length: 12 }, (_, i) => {
              const month = i + 1
              const date = new Date(selectedYear, i)
              return (
                <option key={month} value={month}>
                  {format(date, 'MMMM', { locale: de })}
                </option>
              )
            })}
          </select>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`border rounded-lg p-4 mb-6 ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-start justify-between">
            <p className="text-sm">{message.text}</p>
            <button 
              onClick={() => setMessage(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Ausgewählter Monat */}
      <div className={`border rounded-lg p-4 mb-6 ${
        monthStatus === 'locked' 
          ? 'bg-red-50 border-red-200' 
          : monthStatus === 'open'
          ? 'bg-green-50 border-green-200'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`font-medium ${
              monthStatus === 'locked' ? 'text-red-900' : 
              monthStatus === 'open' ? 'text-green-900' : 'text-gray-900'
            }`}>
              Ausgewählter Monat: {format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: de })}
            </h3>
            <p className={`text-sm ${
              monthStatus === 'locked' ? 'text-red-700' : 
              monthStatus === 'open' ? 'text-green-700' : 'text-gray-700'
            }`}>
              Status: <span className="font-medium">
                {monthStatus === 'loading' ? 'Wird geladen...' :
                 monthStatus === 'locked' ? 'Gesperrt' : 'Offen'}
              </span>
            </p>
          </div>
          {monthStatus === 'locked' ? (
            <Lock className="h-8 w-8 text-red-600" />
          ) : monthStatus === 'open' ? (
            <CheckCircle className="h-8 w-8 text-green-600" />
          ) : (
            <Calendar className="h-8 w-8 text-gray-600" />
          )}
        </div>
      </div>

      {/* Aktionen */}
      <div className="flex gap-3">
        <button
          onClick={handleMonthLock}
          disabled={isProcessing || monthStatus === 'locked' || monthStatus === 'loading'}
          className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          <Lock className="h-4 w-4" />
          {isProcessing ? 'Schließe ab...' : 'Monat abschließen'}
        </button>

        <button
          onClick={handleMonthUnlock}
          disabled={isProcessing || monthStatus === 'open' || monthStatus === 'loading'}
          className="btn btn-secondary flex items-center gap-2 disabled:opacity-50"
        >
          <Unlock className="h-4 w-4" />
          {isProcessing ? 'Gebe frei...' : 'Monat freigeben'}
        </button>
      </div>

      {/* Warnhinweise */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900 mb-2">Wichtige Hinweise zum Monatsabschluss</h4>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• Nach dem Abschluss können Fachkräfte ihre Zeiteinträge nicht mehr bearbeiten</li>
              <li>• Nur Leitung und Administratoren können abgeschlossene Monate wieder freigeben</li>
              <li>• Prüfen Sie vor dem Abschluss alle Zeiteinträge auf Vollständigkeit</li>
              <li>• Der Abschluss sollte am Ende jeden Monats erfolgen</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MonthlyLockComponent