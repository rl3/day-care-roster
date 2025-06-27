import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Users, Save, Calendar } from 'lucide-react'

interface ChildCountData {
  date: string
  time_slot: string
  under_3_count: number
  over_3_count: number
}

const ChildCountForm: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ChildCountData>({
    defaultValues: {
      date: selectedDate,
      time_slot: '08:00',
      under_3_count: 0,
      over_3_count: 0
    }
  })

  // Zeitslots von 8:00 bis 16:00 in 30-Min-Schritten
  const timeSlots = []
  for (let hour = 8; hour <= 16; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`)
    if (hour < 16) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`)
    }
  }

  const onSubmit = (data: ChildCountData) => {
    console.log('Child count data:', data)
    // TODO: API-Call implementieren
  }

  const under3Count = watch('under_3_count')
  const over3Count = watch('over_3_count')
  const totalChildren = under3Count + over3Count

  // Berechnung Fachkraft-Kind-Schlüssel
  const requiredStaffUnder3 = Math.ceil(under3Count / 4.25)
  const requiredStaffOver3 = Math.ceil(over3Count / 10)
  const totalRequiredStaff = requiredStaffUnder3 + requiredStaffOver3

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-5 w-5 text-primary-600" />
        <h2 className="text-lg font-medium text-gray-900">Kinderanzahl erfassen</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Datum und Zeitslot */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="form-label">
              <Calendar className="inline h-4 w-4 mr-1" />
              Datum
            </label>
            <input
              type="date"
              className="form-input"
              {...register('date', { required: 'Datum ist erforderlich' })}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
          </div>

          <div>
            <label className="form-label">Zeitslot</label>
            <select
              className="form-input"
              {...register('time_slot', { required: 'Zeitslot ist erforderlich' })}
            >
              {timeSlots.map(slot => (
                <option key={slot} value={slot}>{slot} Uhr</option>
              ))}
            </select>
          </div>
        </div>

        {/* Kinderanzahlen */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 border-b pb-2">Kinderanzahl</h3>
            
            <div>
              <label className="form-label">Kinder unter 3 Jahre</label>
              <input
                type="number"
                min="0"
                max="30"
                className="form-input"
                {...register('under_3_count', { 
                  required: 'Anzahl ist erforderlich',
                  min: { value: 0, message: 'Muss 0 oder größer sein' },
                  max: { value: 30, message: 'Maximal 30 Kinder' }
                })}
              />
              {errors.under_3_count && <p className="text-red-500 text-sm mt-1">{errors.under_3_count.message}</p>}
            </div>

            <div>
              <label className="form-label">Kinder über 3 Jahre</label>
              <input
                type="number"
                min="0"
                max="50"
                className="form-input"
                {...register('over_3_count', { 
                  required: 'Anzahl ist erforderlich',
                  min: { value: 0, message: 'Muss 0 oder größer sein' },
                  max: { value: 50, message: 'Maximal 50 Kinder' }
                })}
              />
              {errors.over_3_count && <p className="text-red-500 text-sm mt-1">{errors.over_3_count.message}</p>}
            </div>
          </div>

          {/* Fachkraft-Kind-Schlüssel Berechnung */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 border-b pb-2">Fachkraft-Kind-Schlüssel</h3>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Gesamt Kinder:</span>
                <span className="font-medium">{totalChildren}</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Benötigt für U3:</span>
                  <span>{requiredStaffUnder3} Fachkraft{requiredStaffUnder3 !== 1 ? 'kräfte' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Benötigt für Ü3:</span>
                  <span>{requiredStaffOver3} Fachkraft{requiredStaffOver3 !== 1 ? 'kräfte' : ''}</span>
                </div>
              </div>
              
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-medium text-gray-900">Gesamt benötigt:</span>
                <span className="font-bold text-primary-600">
                  {totalRequiredStaff} Fachkraft{totalRequiredStaff !== 1 ? 'kräfte' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            type="submit"
            className="btn btn-primary flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Speichern
          </button>
        </div>
      </form>

      {/* Hinweise */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Hinweise zum Fachkraft-Kind-Schlüssel</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• <strong>Unter 3 Jahre:</strong> 1 Pädagoge auf 4,25 Kinder</p>
          <p>• <strong>Über 3 Jahre:</strong> 1 Pädagoge auf 10 Kinder</p>
          <p>• Die Erfassung erfolgt für jeden Zeitslot von 8:00 bis 16:00 Uhr</p>
          <p>• Diese Daten werden für die Personalplanung und Statistiken verwendet</p>
        </div>
      </div>
    </div>
  )
}

export default ChildCountForm