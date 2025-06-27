import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Clock, Calendar, Users, TrendingUp, Baby, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import MonthlyLockComponent from '../components/MonthlyLockComponent'

const DashboardPage: React.FC = () => {
  const { user } = useAuth()

  const quickActions = [
    {
      title: 'Arbeitszeit erfassen',
      description: 'Neue Zeiteinträge hinzufügen',
      icon: Clock,
      href: '/time-entries',
      color: 'bg-blue-500',
    },
    {
      title: 'Kinderanzahl erfassen',
      description: 'Anwesende Kinder je Zeitslot',
      icon: Baby,
      href: '/child-count',
      color: 'bg-pink-500',
    },
    {
      title: 'Statistiken ansehen',
      description: 'Überstunden und Auswertungen',
      icon: TrendingUp,
      href: '/statistics',
      color: 'bg-green-500',
    },
    {
      title: 'Kalenderansicht',
      description: 'Monatsübersicht öffnen',
      icon: Calendar,
      href: '/time-entries?view=calendar',
      color: 'bg-purple-500',
    },
    ...(user?.role !== 'fachkraft' ? [{
      title: 'Benutzer verwalten',
      description: 'Mitarbeiter hinzufügen/bearbeiten',
      icon: Users,
      href: '/users',
      color: 'bg-orange-500',
    }] : []),
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Willkommen, {user?.full_name}!
        </h1>
        <p className="text-gray-600 mt-2">
          Heute ist {new Date().toLocaleDateString('de-DE', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quickActions.map((action, index) => (
          <Link
            key={index}
            to={action.href}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center">
              <div className={`${action.color} p-3 rounded-lg`}>
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {action.title}
                </h3>
                <p className="text-gray-500 text-sm">
                  {action.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Ihre Arbeitszeit-Konfiguration
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {user?.weekly_hours}h
            </div>
            <div className="text-sm text-gray-500">Wochenstunden</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {user?.additional_hours}h
            </div>
            <div className="text-sm text-gray-500">Sonderstunden</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {user?.work_days_per_week}
            </div>
            <div className="text-sm text-gray-500">Arbeitstage/Woche</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {user?.vacation_days_per_year}
            </div>
            <div className="text-sm text-gray-500">Urlaubstage/Jahr</div>
          </div>
        </div>
      </div>

      {/* Monatsabschluss für Leitung/Admin */}
      {(user?.role === 'leitung' || user?.role === 'admin') && (
        <MonthlyLockComponent />
      )}

      {/* Schnellzugriff Info */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Schnellzugriff
        </h2>
        <p className="text-gray-500">
          Nutzen Sie die Karten oben für schnellen Zugriff auf die wichtigsten Funktionen.
          Die App ist für mobile Nutzung optimiert - Sie können sie auch auf Ihrem Smartphone als App installieren.
        </p>
      </div>
    </div>
  )
}

export default DashboardPage