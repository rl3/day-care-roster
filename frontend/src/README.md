# Kita Dienstplan - Client/Server Docker-Compose Anwendung

Eine vollständige Dienstplan-Anwendung für Kindertagesstätten mit Python FastAPI Backend und React TypeScript Frontend.

## Funktionen

### Benutzerrollen
- **Fachkraft**: Eigene Zeiterfassung und Statistiken
- **Leitung**: Alle Zeiterfassungen und Statistiken einsehen
- **Admin**: Vollzugriff inkl. Benutzerverwaltung

### Zeiterfassung
- Arbeitszeit (Stunden am Kind, Vorbereitungszeit, Meetings, etc.)
- Krankheit, Kindkrankheit, Urlaub, Bildungsurlaub
- Hospitation und Praktikum
- Kinderanzahl-Erfassung je Zeitslot

### Auswertungen
- Wochen-/Monatsstatistiken
- Überstunden-Berechnung
- Fachkraft-Kind-Schlüssel
- Jahresstatistiken pro Mitarbeiter

## Technologie-Stack

### Backend
- **Python 3.11** mit FastAPI
- **SQLAlchemy** ORM mit MySQL/SQLite
- **JWT** Authentifizierung
- **Pydantic** für Datenvalidierung

### Frontend
- **React 18** mit TypeScript
- **Vite** als Build-Tool
- **TailwindCSS** für Styling
- **React Query** für API-Calls
- **React Router** für Navigation
- **PWA** Support für mobile Installation

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

## Mobile Optimierung

Die Anwendung ist für mobile Nutzung optimiert:
- Responsive Design mit TailwindCSS
- Touch-freundliche Bedienelemente
- PWA Support für App-Installation
- Offline-Funktionalität (geplant)

## Sicherheit

- JWT-basierte Authentifizierung
- Rollenbasierte Zugriffskontrolle
- Passwort-Hashing mit bcrypt
- CORS-Schutz
- SQL-Injection Schutz durch SQLAlchemy

## Lizenz

[Ihre Lizenz hier einfügen]