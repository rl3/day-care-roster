# 🧹 Git Repository Cleanup Guide

## ⚠️ Wichtige Dateien aus Git-History entfernen

Falls bereits sensitive Dateien committet wurden, führe die folgenden Schritte aus:

### 1. Aktuelle sensitive Dateien prüfen

```bash
# Prüfe welche Dateien bereits getrackt werden und ignoriert werden sollten
git status --ignored

# Prüfe spezifisch nach problematischen Dateien
find . -name "*.db" -o -name ".env" -o -name "*.log" | grep -v git
```

### 2. Dateien aus Git-Tracking entfernen (aber lokal behalten)

```bash
# Einzelne Dateien/Ordner entfernen
git rm --cached backend/kita_dienstplan.db
git rm --cached .env
git rm -r --cached data/

# Alle ignorierten Dateien auf einmal entfernen
git rm -r --cached .
git add .
```

### 3. Git-History bereinigen (falls bereits committet)

**ACHTUNG:** Das verändert die Git-History und kann problematisch sein bei geteilten Repositories!

```bash
# Option 1: BFG Repo-Cleaner (empfohlen)
# Installation: https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --delete-files "*.db"
java -jar bfg.jar --delete-files ".env"
java -jar bfg.jar --delete-folders "data"
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Option 2: Git Filter-Branch (komplex, nicht empfohlen)
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch backend/kita_dienstplan.db' \
  --prune-empty --tag-name-filter cat -- --all
```

### 4. Environment-Datei sicher konfigurieren

```bash
# 1. Beispiel-Datei als Vorlage kopieren
cp .env.example .env

# 2. .env mit sicheren Werten befüllen
nano .env

# 3. Prüfen dass .env nicht getrackt wird
git status  # .env sollte nicht erscheinen
```

### 5. Passwörter und Secrets ändern

Da die Secrets möglicherweise in der Git-History stehen:

1. **Alle Passwörter ändern:**
   - Datenbank-Passwörter
   - SECRET_KEY
   - Admin-Passwort in der Anwendung

2. **Neue sichere Secrets generieren:**
   ```bash
   # Neuen SECRET_KEY generieren
   openssl rand -base64 32
   
   # Oder mit Python
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

### 6. Git-Status final prüfen

```bash
# Prüfen dass keine sensitiven Dateien getrackt werden
git status

# .gitignore testen
git check-ignore -v data/
git check-ignore -v .env
git check-ignore -v backend/kita_dienstplan.db

# Sollten alle als ignored erkannt werden
```

## 🔒 Zukünftige Best Practices

### 1. Pre-Commit Hooks einrichten

```bash
# .git/hooks/pre-commit erstellen
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Prüfe auf sensitive Dateien vor Commit

if git diff --cached --name-only | grep -E "\.(db|sqlite)$|\.env$|data/"; then
    echo "❌ FEHLER: Sensitive Dateien gefunden!"
    echo "Entferne diese Dateien mit: git reset HEAD <file>"
    exit 1
fi

if git diff --cached | grep -i "password\s*=\s*[^{]"; then
    echo "❌ WARNUNG: Mögliche Passwörter im Code gefunden!"
    echo "Prüfe deine Änderungen sorgfältig."
fi
EOF

chmod +x .git/hooks/pre-commit
```

### 2. Git-Secrets installieren (optional)

```bash
# Git-secrets installieren
brew install git-secrets  # macOS
# oder apt-get install git-secrets  # Ubuntu

# Konfigurieren
git secrets --register-aws
git secrets --install
git secrets --scan
```

### 3. Sichere Entwicklungsumgebung

```bash
# 1. Lokale .env niemals committen
echo ".env" >> .git/info/exclude

# 2. Beispiel-Konfiguration aktuell halten
# Wenn .env.example geändert wird, Team informieren

# 3. Produktionsgeheimnisse separat verwalten
# - Kubernetes Secrets
# - Docker Secrets
# - Externe Secret Manager (AWS Secrets Manager, etc.)
```

## 🚨 Bei versehentlichem Commit von Secrets

1. **Sofort handeln:** Commit nicht pushen falls noch lokal
2. **Secrets sofort ändern:** Alle betroffenen Passwörter/Keys
3. **History bereinigen:** Mit BFG oder Filter-Branch
4. **Team informieren:** Falls bereits gepusht wurde
5. **Monitoring:** Logs auf verdächtige Aktivitäten prüfen

## ✅ Aktuelle .gitignore Validierung

Die aktuelle `.gitignore` ignoriert folgende kritische Bereiche:

- ✅ **Datenbanken:** `*.db`, `*.sqlite`, `data/`
- ✅ **Environment:** `.env*`, `ssl/`
- ✅ **Build Outputs:** `dist/`, `node_modules/`, `__pycache__/`
- ✅ **Logs:** `*.log`, `logs/`
- ✅ **IDE Files:** `.vscode/`, `.idea/`
- ✅ **OS Files:** `.DS_Store`, `Thumbs.db`

Diese Konfiguration sollte alle sensitiven Dateien erfassen.