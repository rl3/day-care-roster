# Kita Dienstplan - Frontend (React TypeScript PWA)

Eine vollständige Progressive Web App für die Zeiterfassung und Verwaltung in Kindertagesstätten.

## ✅ Implementierte Features

### 🔐 Benutzerrollen & Sicherheit
- **Fachkraft**: Eigene Zeiterfassung und Statistiken
- **Leitung**: Alle Zeiterfassungen und Statistiken einsehen
- **Admin**: Vollzugriff inkl. Benutzerverwaltung
- JWT-Authentifizierung mit automatischem Token-Refresh

### ⏰ Zeiterfassung
- **Arbeitszeit** mit automatischer Vorbereitungszeit-Berechnung (Faktor 0,5)
- **Alle Erfassungsarten**: Stunden am Kind, Vorbereitung, Meetings, Leitung, etc.
- **Abwesenheiten**: Krankheit, Kindkrankheit, Urlaub, Bildungsurlaub (Tage/halbe Tage)
- **Sonderzeiten**: Hospitation, Praktikum, Fortbildung
- **Kalenderansicht** für intuitive Erfassung und Übersicht

### 👶 Kinderanzahl-Erfassung
- **Zeitslot-basierte Erfassung** (30-Min-Slots von 8:00-16:00)
- **Altersgruppen**: Unter 3 Jahre / Über 3 Jahre
- **Automatische Bedarfsberechnung** (Fachkraft-Kind-Schlüssel)
- **Personalbedarf-Anzeige** in Echtzeit

### 📊 Statistiken & Auswertungen
- **Wochen-/Monatsstatistiken** mit Überstunden-Berechnung
- **Jahresübersichten** pro Mitarbeiter
- **Fachkraft-Kind-Schlüssel** Berechnungen und Vergleiche
- **Rollenbasierte Filterung** und Datenansicht
- **Export-Funktionen** für CSV/Excel

### 🔒 Monatsabschluss
- **Sperrfunktion** für abgeschlossene Monate
- **Bulk-Operationen** für mehrere Mitarbeiter
- **E-Mail-Benachrichtigungen** mit HTML-Templates
- **Push-Benachrichtigungen** für mobile Geräte

### 👥 Benutzerverwaltung
- **Vollständige CRUD-Operationen** für Benutzer
- **Schnellkonfiguration** mit vorgefertigten Rollen-Templates
- **Arbeitszeit-Konfiguration** pro Mitarbeiter
- **Rollenbasierte Berechtigungen**

## Technologie-Stack

### Backend
- **Python 3.11** mit FastAPI
- **SQLAlchemy** ORM mit MySQL/SQLite
- **JWT** Authentifizierung
- **Pydantic** für Datenvalidierung

### Frontend (PWA)
- **React 18** mit TypeScript für moderne UI-Entwicklung
- **Vite** als Build-Tool mit Hot Module Replacement
- **TailwindCSS** für responsive, mobile-first Design
- **React Query** für optimiertes API-Caching und State Management
- **React Router** für SPA-Navigation mit Future Flags
- **Progressive Web App (PWA)** Features:
  - Service Worker für Offline-Funktionalität
  - App-Installation auf Desktop und Mobile
  - Push-Benachrichtigungen mit VAPID
  - Background Sync für Offline-Aktionen
  - App-Icons und Splash Screens

### Infrastruktur
- **Docker Compose** für lokale Entwicklung
- **MySQL 8.0** Datenbank
- **CORS** konfiguriert für Frontend-Backend Kommunikation

## Installation und Start

### Voraussetzungen
- Docker und Docker Compose installiert
- Git für das Klonen des Repositories

### Schritt 1: Repository klonen
```bash
git clone <repository-url>
cd kita-dienstplan
```

### Schritt 2: Anwendung starten
```bash
docker-compose up --build
```

### Schritt 3: Zugriff
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Dokumentation**: http://localhost:8000/docs

## Erste Schritte

### Admin-Benutzer erstellen
Nach dem ersten Start müssen Sie einen Admin-Benutzer erstellen:

```bash
# In einem neuen Terminal
docker-compose exec backend python -c "
from database import SessionLocal
from models import User, UserRole
from auth import get_password_hash

db = SessionLocal()
admin_user = User(
    username='admin',
    email='admin@kita.de',
    hashed_password=get_password_hash('admin123'),
    full_name='Administrator',
    role=UserRole.ADMIN,
    weekly_hours=40,
    additional_hours=0,
    work_days_per_week=5,
    vacation_days_per_year=30
)
db.add(admin_user)
db.commit()
print('Admin-Benutzer erstellt: admin / admin123')
"
```

### Beispiel-Mitarbeiter erstellen
```bash
# Leitung
docker-compose exec backend python -c "
from database import SessionLocal
from models import User, UserRole
from auth import get_password_hash

db = SessionLocal()
user = User(
    username='leitung',
    email='leitung@kita.de',
    hashed_password=get_password_hash('leitung123'),
    full_name='Kita-Leitung',
    role=UserRole.LEITUNG,
    weekly_hours=30,
    additional_hours=14.1875,  # 12.1875h Leitung + 2h Anleitung
    work_days_per_week=5,
    vacation_days_per_year=32
)
db.add(user)
db.commit()
print('Benutzer erstellt: leitung / leitung123')
"
```

## Entwicklung

### Backend entwickeln
```bash
# Backend Container mit live reload
docker-compose up backend

# Oder lokal mit Python
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend entwickeln
```bash
# Frontend Container mit live reload
docker-compose up frontend

# Oder lokal mit Node.js
cd frontend
npm install
npm run dev
```

### Datenbank-Migrationen
```bash
# Neue Migration erstellen
docker-compose exec backend alembic revision --autogenerate -m "Beschreibung"

# Migration ausführen
docker-compose exec backend alembic upgrade head
```

## 📱 Progressive Web App (PWA)

Die Anwendung ist eine vollständige PWA mit Enterprise-Features:

### ✅ Mobile Optimierung
- **Responsive Design** mit TailwindCSS für alle Bildschirmgrößen
- **Touch-optimierte** Bedienelemente (80% Smartphone-Nutzung)
- **Viewport-optimiert** mit Safe Area Support für Notch-Geräte
- **Mobile-First** Entwicklungsansatz

### ✅ App-Installation
- **"Add to Home Screen"** auf iOS und Android
- **Desktop-Installation** über Chrome/Edge
- **Native App-Erlebnis** mit eigenem Icon und Fenster
- **App-Shortcuts** für Schnellzugriff auf Hauptfeatures

### ✅ Offline-Funktionalität
- **Service Worker** mit Cache-First-Strategie für API-Daten
- **Background Sync** für Offline-Aktionen (automatische Synchronisation)
- **Offline-Indikator** mit Benutzerfeedback
- **Cache-Management** für optimale Performance

### ✅ Push-Benachrichtigungen
- **VAPID-basierte** Web Push Notifications
- **Automatische Benachrichtigungen** bei Monatsabschluss
- **Erinnerungen** vor wichtigen Deadlines
- **Cross-Platform** Support (Desktop, Android, iOS)

### ✅ PWA-Standards
- **Web App Manifest** mit korrekten Meta-Daten
- **Service Worker** für Offline-Support
- **HTTPS-Ready** für Production
- **Lighthouse-optimiert** für beste Performance

## Sicherheit

- JWT-basierte Authentifizierung
- Rollenbasierte Zugriffskontrolle
- Passwort-Hashing mit bcrypt
- CORS-Schutz
- SQL-Injection Schutz durch SQLAlchemy

## Lizenz

[Ihre Lizenz hier einfügen]