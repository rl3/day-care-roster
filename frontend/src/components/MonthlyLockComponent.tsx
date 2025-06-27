import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Lock, Unlock, Calendar, AlertTriangle, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

const MonthlyLockComponent: React.FC = () => {
  const { user } = useAuth()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [isProcessing, setIsProcessing] = useState(false)

  const canLockMonths = user?.role === 'leitung' || user?.role === 'admin'

  const handleMonthLock = async () => {
    if (!canLockMonths) return
    
    const confirmMessage = `Möchten Sie den Monat ${format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: de })} wirklich abschließen?\n\nNach dem Abschluss können Fachkräfte ihre Zeiteinträge für diesen Monat nicht mehr bearbeiten.`
    
    if (!window.confirm(confirmMessage)) return
    
    setIsProcessing(true)
    
    try {
      // TODO: API-Call für Monatsabschluss
      console.log('Locking month:', selectedYear, selectedMonth)
      
      // Simulation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      alert(`Monat ${format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: de })} wurde erfolgreich abgeschlossen.`)
    } catch (error) {
      alert('Fehler beim Abschließen des Monats: ' + error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMonthUnlock = async () => {
    if (!canLockMonths) return
    
    const confirmMessage = `Möchten Sie den Monat ${format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: de })} wieder freigeben?\n\nFachkräfte können dann ihre Zeiteinträge wieder bearbeiten.`
    
    if (!window.confirm(confirmMessage)) return
    
    setIsProcessing(true)
    
    try {
      // TODO: API-Call für Monatsfreigabe
      console.log('Unlocking month:', selectedYear, selectedMonth)
      
      // Simulation
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      alert(`Monat ${format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: de })} wurde wieder freigegeben.`)
    } catch (error) {
      alert('Fehler beim Freigeben des Monats: ' + error)
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

      {/* Ausgewählter Monat */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-blue-900">
              Ausgewählter Monat: {format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: de })}
            </h3>
            <p className="text-sm text-blue-700">
              Status: <span className="font-medium">Offen</span> {/* TODO: Echten Status abrufen */}
            </p>
          </div>
          <CheckCircle className="h-8 w-8 text-blue-600" />
        </div>
      </div>

      {/* Aktionen */}
      <div className="flex gap-3">
        <button
          onClick={handleMonthLock}
          disabled={isProcessing}
          className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          <Lock className="h-4 w-4" />
          {isProcessing ? 'Schließe ab...' : 'Monat abschließen'}
        </button>

        <button
          onClick={handleMonthUnlock}
          disabled={isProcessing}
          className="btn btn-secondary flex items-center gap-2 disabled:opacity-50"
        >
          <Unlock className="h-4 w-4" />
          Monat freigeben
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

      {/* TODO-Liste für echte Implementierung */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Noch zu implementieren (Backend)</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• API-Endpoint für Monatsabschluss (POST /api/monthly-locks/)</li>
          <li>• API-Endpoint für Monatsfreigabe (DELETE /api/monthly-locks/{'{id}'})</li>
          <li>• Status-Abfrage für bestehende Monatsabschlüsse</li>
          <li>• Automatische Sperrung von Zeiteinträgen nach Abschluss</li>
        </ul>
      </div>
    </div>
  )
}

export default MonthlyLockComponent