# Kita Dienstplan - Docker-Compose Anwendung

Eine vollständige Client/Server-Anwendung für die Dienstplanung in Kindertagesstätten basierend auf den Anforderungen aus `Anforderungen.txt`.

## 🚀 Schnellstart

### 1. Environment konfigurieren
```bash
# .env-Datei erstellen
cp .env.example .env
# Optional: Passwörter in .env anpassen
```

### 2. Anwendung starten
```bash
# Alle Services starten
docker-compose up --build

# Oder im Hintergrund
docker-compose up --build -d
```

### 3. Zugriff
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Dokumentation**: http://localhost:8000/docs

### 4. Login
Die folgenden Benutzer wurden automatisch erstellt:

- **Admin**: `admin` / `admin123` (Vollzugriff)
- **Leitung**: `leitung` / `leitung123` (Alle Mitarbeiter einsehen)

> 📖 **Detaillierte Datenbank-Setup-Anleitung**: [DATABASE_SETUP.md](DATABASE_SETUP.md)

## 📋 Funktionsumfang

### ✅ Vollständig implementiert

#### 🖥 Core Application
- **Docker-Compose Setup** mit Backend, Frontend und MySQL
- **Benutzerrollen**: Fachkraft, Leitung, Admin mit korrekten Berechtigungen
- **JWT-Authentifizierung** mit sicherer Token-Verwaltung
- **REST API** mit FastAPI und vollständiger OpenAPI-Dokumentation
- **Responsive Frontend** optimiert für 80% Smartphone-Nutzung

#### 📊 Datenbankmodelle & APIs
- **User-Management** mit Arbeitszeit-Konfiguration und Löschfunktion
- **Zeiterfassung** (Arbeitszeit, Krankheit, Urlaub, etc.) + API
- **Kinderanzahl-Erfassung** je Zeitslot + vollständige API
- **Globale Events** (Schließtage, frühere Betriebsschlüsse) + API
- **Monatsabschluss** mit Sperrfunktion + vollständige API
- **Automatische Vorbereitungszeit-Berechnung** (Faktor 0,5)

#### 📱 Frontend Features  
- **Zeiterfassungsformulare** mit allen Erfassungsarten und Unterarten
- **Kalenderansicht** für intuitive Zeiterfassung
- **Statistiken und Auswertungen**:
  - Wochen-/Monatsansichten mit Überstunden-Berechnung
  - Jahresstatistiken pro Mitarbeiter
  - Fachkraft-Kind-Schlüssel Berechnungen
  - Rollenbasierte Filterung
- **Benutzerverwaltung UI** mit Erstellen, Bearbeiten und Löschen von Mitarbeitern
- **Kinderanzahl-Erfassung** mit automatischer Bedarfsberechnung
- **Monatsabschluss-Funktionalität** für Leitung/Admin

#### 📧 Benachrichtigungen & Import/Export
- **E-Mail-Benachrichtigungen** für Monatsabschluss mit HTML-Templates
- **Push-Benachrichtigungen** mit VAPID-Support für PWA
- **Import/Export-Funktionen** für CSV/Excel-Dateien
- **Template-Download** für korrekten Import-Format

#### 📱 Progressive Web App (PWA)
- **Offline-Funktionalität** mit Service Worker und Cache-Strategien
- **App-Installation** auf Desktop und Mobile
- **App-Icons** in verschiedenen Größen und Splash Screens
- **Background Sync** für Offline-Aktionen
- **Push-Notifications** für wichtige Updates

## 🛠 Technologie-Stack

### Backend (Python)
- **FastAPI** für REST API
- **SQLAlchemy** ORM mit MySQL 8.0
- **PyMySQL** Database Driver
- **JWT** Authentifizierung mit bcrypt
- **Pydantic** Datenvalidierung
- **Automatische Datenbankinitialisierung**

### Frontend (TypeScript/React)
- **React 18** mit TypeScript
- **Vite** Build-Tool
- **TailwindCSS** für mobile-first Design
- **React Query** für API-Management
- **React Router** für Navigation
- **PWA** Support

### Infrastruktur
- **Docker Compose** mit Health Checks
- **MySQL 8.0** Primary Database
- **Automatische Datenbankinitialisierung**
- **Environment-basierte Konfiguration**
- **Hot-Reload** für Entwicklung

## 📱 Mobile Optimierung

- **Responsive Design** mit TailwindCSS
- **Touch-optimierte** Bedienelemente
- **PWA-Manifest** für App-Installation
- **Mobile-First** Ansatz
- **Schnelle Ladezeiten** durch Vite

## 🔐 Sicherheit & Berechtigungen

- **Rollenbasierte Zugriffskontrolle**:
  - **Fachkraft**: Nur eigene Daten
  - **Leitung**: Alle Mitarbeiterdaten
  - **Admin**: Vollzugriff + Systemkonfiguration
- **bcrypt** Passwort-Hashing
- **JWT** mit Expiration
- **SQL-Injection** Schutz durch SQLAlchemy
- **CORS** Sicherheit

## 🗃 Datenmodell

Entspricht vollständig den Anforderungen:

- **Zeiterfassungsarten**:
  - Arbeitszeit mit Unterarten (Stunden am Kind, Vorbereitung, etc.)
  - Krankheit, Kindkrankheit (Tage/halbe Tage)
  - Urlaub, Bildungsurlaub (Tage/halbe Tage)
  - Hospitation, Praktikum extern

- **Kindererfassung**: 0,5h-Slots von 8:00-16:00 (unter/über 3 Jahre)

- **Mitarbeiterkonfiguration**: Wie in Anforderungen definiert
  - Leitung: 30h + 14,1875h Sonder + 32 Tage Urlaub
  - Fachkraft: 26h + 2h Vertretung + 32 Tage Urlaub
  - Etc.

## 🚀 Entwicklung

```bash
# Backend separat starten
docker-compose up backend db

# Frontend separat starten  
docker-compose up frontend

# Logs anzeigen
docker-compose logs -f backend
docker-compose logs -f frontend

# Datenbank zurücksetzen
docker-compose down -v
docker-compose up --build
```

## 📚 API-Endpunkte

Die vollständige API-Dokumentation ist verfügbar unter: `http://localhost:8000/docs`

### Implementierte APIs:
- `/api/auth/` - Authentifizierung (Login, Token-Refresh)
- `/api/users/` - Benutzerverwaltung (CRUD, Rollen, Löschen mit Sicherheitscheck)
- `/api/time-entries/` - Zeiterfassung (CRUD, Validierung)
- `/api/statistics/` - Auswertungen (Wochen/Monat/Jahr)
- `/api/child-counts/` - Kinderanzahl (CRUD, Bedarfsberechnung)
- `/api/monthly-locks/` - Monatsabschluss (Lock/Unlock, Bulk-Operationen)
- `/api/global-events/` - Events (CRUD, Kalender-Integration)
- `/api/export-import/` - Import/Export (CSV/Excel, Templates)
- `/api/push/` - Push-Benachrichtigungen (Subscribe, Send)

## 🚀 Mögliche Erweiterungen

1. **Reporting & Analytics**:
   - PDF-Export für Statistiken
   - Grafische Charts (Chart.js/D3.js)
   - Erweiterte Filteroptionen
   - Dashboard-Widgets

2. **Erweiterte Features**:
   - Urlaubsplanung mit Genehmigungsworkflow
   - Schichtplanung und Dienstpläne
   - Mitarbeiter-Self-Service Portal
   - Integration mit Personalsystemen

3. **Administration**:
   - Automatische Backups
   - Audit-Logs für Compliance
   - Multi-Kita-Verwaltung
   - Advanced Role Management

4. **Integrationen**:
   - Single Sign-On (SSO)
   - LDAP/Active Directory
   - Payroll-System Integration
   - Calendar-Sync (Outlook/Google)

## 🎉 Status

**🎯 Die Kita Dienstplan-Anwendung ist vollständig implementiert und produktionsbereit!**

### ✅ Alle Anforderungen erfüllt:
- ✅ **Vollständige Backend-APIs** für alle Features
- ✅ **Mobile-optimierte PWA** mit Offline-Support
- ✅ **Zeiterfassung** mit automatischer Vorbereitungszeit
- ✅ **Statistiken und Auswertungen** mit Fachkraft-Kind-Schlüssel
- ✅ **Benutzerverwaltung** mit rollenbasierten Berechtigungen
- ✅ **Kinderanzahl-Erfassung** mit Bedarfsberechnung
- ✅ **Monatsabschluss** mit E-Mail und Push-Benachrichtigungen
- ✅ **Import/Export** für CSV/Excel-Dateien
- ✅ **Progressive Web App** mit Installation und Notifications

Die Anwendung kann **sofort produktiv eingesetzt werden** und erfüllt alle ursprünglichen Anforderungen aus `Anforderungen.txt`.