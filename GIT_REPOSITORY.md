# 📦 Git Repository Management

## ✅ Repository Status

Das Kita Dienstplan Repository ist korrekt für Git konfiguriert mit:

- **Vollständige .gitignore** für alle sensitiven Dateien
- **Environment-Templates** (.env.example, .env.prod)
- **VS Code Konfiguration** für optimale Entwicklererfahrung
- **Deployment-Dokumentation** für Production Setup

## 🔒 Sicherheitscheck bestanden

Die folgenden kritischen Dateien werden **NICHT** getrackt:

```
✅ IGNORED (Sicher):
- data/                     # Datenbank-Volumes
- backend/kita_dienstplan.db # SQLite-Datenbank
- backend/__pycache__/       # Python Cache
- .env                       # Environment-Variablen
- *.log                      # Log-Dateien
- node_modules/              # Node Dependencies
- frontend/dist/             # Build-Artefakte
- ssl/                       # SSL-Zertifikate
```

## 📁 Repository-Struktur

```
kita-dienstplan/
├── 📄 .gitignore              # Git Ignore-Regeln
├── 📄 .env.example            # Environment-Template
├── 📄 .env.prod               # Production-Template
├── 📄 GIT_CLEANUP.md          # Git-Cleanup-Guide
├── 📄 DEPLOYMENT.md           # Deployment-Guide
├── 📄 README.md               # Haupt-Dokumentation
├── 🐳 Dockerfile.prod         # Production Docker
├── 🐳 docker-compose.yml      # Development Setup
├── 🐳 docker-compose.prod.yml # Production Setup
├── 🚀 deploy.sh               # Deployment Script
├── ⚙️ nginx.conf              # Nginx-Konfiguration
├── 📁 .vscode/                # VS Code Settings
├── 📁 backend/                # Python/FastAPI Backend
│   ├── 📄 main.py
│   ├── 📄 models.py
│   ├── 📄 auth.py
│   ├── 📄 database.py
│   ├── 📄 requirements.txt
│   └── 📁 routers/
└── 📁 frontend/               # React/TypeScript Frontend
    ├── 📄 package.json
    ├── 📄 vite.config.ts
    ├── 📄 tailwind.config.js
    └── 📁 src/
```

## 🚀 Erstes Setup für neue Entwickler

### 1. Repository klonen
```bash
git clone <repository-url>
cd kita-dienstplan
```

### 2. Environment konfigurieren
```bash
# Entwicklungsumgebung
cp .env.example .env
# .env mit lokalen Einstellungen anpassen

# Oder für Production
cp .env.prod .env
# .env mit Production-Werten anpassen
```

### 3. Entwicklungsumgebung starten
```bash
# Docker Development
docker-compose up --build

# Oder lokal
cd backend && pip install -r requirements.txt
cd frontend && npm install
```

### 4. Production Deployment
```bash
./deploy.sh
```

## 🔧 Git-Workflows

### Standard Development Workflow
```bash
# 1. Neue Feature-Branch
git checkout -b feature/neue-funktion

# 2. Entwickeln und testen
# ... Code-Änderungen ...

# 3. Committen (Pre-Commit-Hooks prüfen automatisch)
git add .
git commit -m "feat: neue Zeiterfassungs-Funktion hinzugefügt"

# 4. Push und Pull Request
git push origin feature/neue-funktion
```

### Hotfix-Workflow
```bash
# 1. Hotfix-Branch von main
git checkout main
git checkout -b hotfix/kritischer-bugfix

# 2. Fix implementieren
# ... Bugfix ...

# 3. Direkt nach main mergen
git checkout main
git merge hotfix/kritischer-bugfix
git push origin main

# 4. Sofort deployen
./deploy.sh
```

### Release-Workflow
```bash
# 1. Release-Branch erstellen
git checkout -b release/v1.1.0

# 2. Version-Bumping und finale Tests
# ... Updates ...

# 3. Tag erstellen
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0

# 4. Production Deployment
./deploy.sh
```

## 🛡️ Sicherheits-Checks

### Pre-Commit Automatisierung

Die `.git/hooks/pre-commit` (optional einzurichten) prüft:
- Keine .db-Dateien
- Keine .env-Dateien  
- Keine Passwörter im Code
- Keine data/-Ordner

### Regelmäßige Security-Audits
```bash
# Dependency-Schwachstellen prüfen
cd frontend && npm audit
cd backend && pip-audit  # pip install pip-audit

# Git-History auf Secrets scannen
git log --all --grep="password\|secret\|key" -i

# Docker-Images scannen
docker scan kita-dienstplan:latest
```

## 📊 Branch-Strategien

### GitFlow (Empfohlen für Teams)
- **main**: Production-ready Code
- **develop**: Integration Branch  
- **feature/**: Neue Features
- **release/**: Release-Vorbereitung
- **hotfix/**: Kritische Bugfixes

### GitHub Flow (Einfacher)
- **main**: Immer deploybar
- **feature/**: Direkt von main branchen
- Pull Requests für alle Änderungen

## 🤝 Collaboration Guidelines

### Commit-Messages
```bash
# Format: type(scope): description
feat(auth): JWT-Token-Refresh implementiert
fix(ui): Kalenderansicht Mobile-Layout korrigiert
docs: Deployment-Guide aktualisiert
style(frontend): ESLint-Regeln angepasst
refactor(backend): Database-Connection optimiert
test: Unit-Tests für Zeiterfassung hinzugefügt
```

### Code Review Checklist
- [ ] Keine sensitiven Daten committet
- [ ] Tests laufen durch
- [ ] Documentation aktualisiert
- [ ] Mobile-Optimierung getestet
- [ ] Security-Implications geprüft
- [ ] Performance-Impact evaluiert

## 🚨 Incident Response

### Versehentlich Secrets committet
1. **Sofort:** `GIT_CLEANUP.md` befolgen
2. **Secrets ändern:** Alle betroffenen Passwörter/Keys
3. **Team informieren:** Über Slack/E-Mail
4. **Monitoring:** Logs auf verdächtige Aktivitäten
5. **Dokumentieren:** Incident für Lessons Learned

### Repository kompromittiert
1. **Access sperren:** Repository private setzen
2. **Audit:** Git-History vollständig scannen
3. **Cleanup:** BFG Repo-Cleaner verwenden
4. **Neu aufsetzen:** Falls nötig, fresh Repository
5. **Access erneuern:** Neue Deploy-Keys etc.

## 🎯 Best Practices Zusammenfassung

✅ **DO:**
- Immer .env.example aktuell halten
- Descriptive Commit-Messages schreiben
- Feature-Branches für Entwicklung nutzen
- Regelmäßig Dependencies updaten
- Production-Deployments dokumentieren

❌ **DON'T:**
- Niemals echte .env committen
- Keine Datenbank-Dateien tracken
- Keine node_modules/ committen
- Keine Log-Dateien hinzufügen
- Keine SSL-Zertifikate in Git

Das Repository ist jetzt optimal für sichere Zusammenarbeit konfiguriert! 🎉