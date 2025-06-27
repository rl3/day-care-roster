import React from 'react'
import ChildCountForm from '../components/ChildCountForm'
import { Users } from 'lucide-react'

const ChildCountPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-7 w-7 text-primary-600" />
          Kinderanzahl erfassen
        </h1>
        <p className="text-gray-600 mt-2">
          Erfassung der anwesenden Kinder je Zeitslot für die Personalplanung
        </p>
      </div>

      <ChildCountForm />
    </div>
  )
}

export default ChildCountPage