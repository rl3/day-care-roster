import React from 'react'
import StatisticsOverview from '../components/StatisticsOverview'

const StatisticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Statistiken</h1>
        <p className="text-gray-600 mt-2">
          Überstunden, Auswertungen und Fachkraft-Kind-Schlüssel
        </p>
      </div>

      <StatisticsOverview />
    </div>
  )
}

export default StatisticsPage