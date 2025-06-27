# 📝 Changelog

## v2.0.0 - Vollständige Enterprise PWA (Current)
### 🎯 Alle Features implementiert und produktionsbereit

#### 🔧 Backend APIs Vervollständigt
- ✅ **Child Counts API**: Vollständige CRUD-Operationen für Kinderanzahl-Erfassung
- ✅ **Monthly Locks API**: Monatsabschluss mit Bulk-Operationen und Status-Tracking
- ✅ **Global Events API**: Events mit Kalender-Integration und Event-Typen
- ✅ **Export/Import API**: CSV/Excel Import/Export mit Template-Download
- ✅ **Push Notifications API**: VAPID-basierte Web Push mit Subscription Management

#### ⚡ Advanced Backend Features
- ✅ **Automatische Vorbereitungszeit**: Faktor 0,5 für "Stunden am Kind"
- ✅ **E-Mail-Service**: HTML-Templates für Monatsabschluss-Benachrichtigungen
- ✅ **Background Processing**: Async E-Mail und Push-Benachrichtigungen
- ✅ **Data Validation**: Umfassende Eingabevalidierung und Fehlerbehandlung

#### 📱 Progressive Web App (PWA)
- ✅ **Service Worker**: Offline-Funktionalität mit Cache-First-Strategie
- ✅ **Background Sync**: Automatische Synchronisation von Offline-Aktionen
- ✅ **Push Notifications**: Cross-Platform Web Push mit VAPID
- ✅ **App Installation**: Desktop und Mobile mit nativen App-Erlebnis
- ✅ **App Icons & Splash**: Professionelle Gestaltung mit SVG-Icons
- ✅ **PWA Manifest**: Vollständig konfiguriert mit Shortcuts und Screenshots

#### 🛠 Development & DevOps
- ✅ **Environment Management**: Konsolidierte .env-Konfiguration
- ✅ **Docker Optimierung**: Service Worker nur in Production
- ✅ **React Router**: Future Flags und /index.html Handling
- ✅ **Error Handling**: Umfassende Fehlerbehandlung und User Feedback

#### 📧 Notification System
- ✅ **E-Mail Templates**: Jinja2-basierte HTML-E-Mails für Monatsabschluss
- ✅ **Push Notifications**: Web Push für Monatsabschluss und Erinnerungen
- ✅ **Multi-Channel**: E-Mail UND Push-Benachrichtigungen parallel
- ✅ **Bulk Operations**: Massenbenachrichtigungen für alle Mitarbeiter

### 🏗 Technical Improvements
- **Database Models**: Erweitert um prep_time_hours und Notification-Tabellen
- **API Performance**: Optimierte Queries und Caching-Strategien  
- **Security**: VAPID Keys, sichere Subscription-Verwaltung
- **Monitoring**: Umfassende Logging und Error-Tracking

## v1.0.1 - User Neutralisierung
- **Geändert**: Benutzer 'judith' zu 'leitung' umbenannt für neutrale Bezeichnung
- **Benutzer**: `leitung` / `leitung123` (Rolle: Leitung)
- **Konfiguration**: Schnellkonfiguration-Presets in UserForm neutralisiert
- **Dokumentation**: Alle READMEs und Deployment-Guides aktualisiert
- **Hinweis**: Anforderungen.txt bleibt unverändert (Original-Dokumentation)

## v1.0.0 - Initial Release
- ✅ Vollständige Kita Dienstplan-Anwendung
- ✅ Docker-Compose Setup mit Backend und Frontend
- ✅ Zeiterfassung mit Kalenderansicht
- ✅ Statistiken und Auswertungen
- ✅ Benutzerverwaltung mit Rollen
- ✅ Kinderanzahl-Erfassung
- ✅ Monatsabschluss-Funktionalität
- ✅ Production-Deployment bereit
- ✅ Mobile PWA optimiert