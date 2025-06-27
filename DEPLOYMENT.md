# 🚀 Kita Dienstplan - Production Deployment

Dieses Dokument beschreibt das Deployment der Kita Dienstplan-Anwendung für den Produktionseinsatz.

## 📋 Übersicht

Das Produktionssetup umfasst:
- **Single Container**: Frontend und Backend in einem Container
- **MySQL-Datenbank**: Persistent über Docker Volumes
- **Nginx Reverse Proxy**: Optional für HTTPS und Load Balancing
- **Frontend Build**: React wird zu statischen Dateien kompiliert
- **API-Server**: FastAPI liefert sowohl API als auch Frontend aus

## 🛠 Deployment-Optionen

### Option 1: Automatisches Deployment (Empfohlen)

```bash
# Einfaches Deployment ohne Nginx
./deploy.sh --without-nginx

# Oder mit Nginx Reverse Proxy
./deploy.sh
```

### Option 2: Manuelles Deployment

```bash
# 1. Environment-Datei vorbereiten
cp .env.prod .env
# .env anpassen (Passwörter, Domain, etc.)

# 2. Frontend builden
cd frontend
npm ci
npm run build
cd ..

# 3. Docker Image erstellen
docker build -f Dockerfile.prod -t kita-dienstplan:latest .

# 4. Production starten
docker-compose -f docker-compose.prod.yml up -d

# 5. Initial Setup
docker-compose -f docker-compose.prod.yml exec app python -c "
from database import SessionLocal, engine
from models import Base, User, UserRole
from auth import get_password_hash

Base.metadata.create_all(bind=engine)
db = SessionLocal()
admin_user = User(
    username='admin',
    email='admin@kita.de', 
    hashed_password=get_password_hash('admin123'),
    full_name='Administrator',
    role=UserRole.ADMIN,
    weekly_hours=40, additional_hours=0,
    work_days_per_week=5, vacation_days_per_year=30
)
db.add(admin_user)
db.commit()
db.close()
"
```

## ⚙️ Konfiguration

### Environment-Variablen (.env)

```bash
# Database
MYSQL_PASSWORD=secure_database_password_change_me
MYSQL_ROOT_PASSWORD=secure_root_password_change_me

# Security - WICHTIG: Ändern Sie diesen Schlüssel!
SECRET_KEY=super-secure-secret-key-with-at-least-32-characters

# CORS (für mehrere Domains komma-separiert)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### SSL/HTTPS Setup (Optional)

1. **SSL-Zertifikate bereitstellen:**
   ```bash
   mkdir ssl
   # Zertifikate in ssl/ Ordner kopieren:
   # ssl/certificate.crt
   # ssl/private.key
   ```

2. **Nginx HTTPS konfigurieren:**
   - Uncomment HTTPS-Server Block in `nginx.conf`
   - Domain anpassen
   - Mit `docker-compose --profile with-nginx up -d` starten

## 🌐 Zugriff

Nach erfolgreichem Deployment:

**Ohne Nginx:**
- Anwendung: http://localhost:8000
- API Docs: http://localhost:8000/docs

**Mit Nginx:**
- Anwendung: http://localhost (oder https://yourdomain.com)
- API Docs: http://localhost/docs

**Standard-Login:**
- Username: `admin`
- Password: `admin123`

**Zusätzlichen Leitung-Benutzer erstellen:**
```bash
docker-compose -f docker-compose.prod.yml exec app python -c "
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
    additional_hours=14.1875,
    work_days_per_week=5,
    vacation_days_per_year=32
)
db.add(user)
db.commit()
db.close()
print('Leitung-Benutzer erstellt: leitung / leitung123')
"
```

## 🔧 Verwaltung

### Container-Management

```bash
# Status prüfen
docker-compose -f docker-compose.prod.yml ps

# Logs anzeigen
docker-compose -f docker-compose.prod.yml logs -f app
docker-compose -f docker-compose.prod.yml logs -f db

# Container neu starten
docker-compose -f docker-compose.prod.yml restart app

# Container stoppen
docker-compose -f docker-compose.prod.yml down

# Komplett stoppen und Volumes löschen (ACHTUNG: Datenverlust!)
docker-compose -f docker-compose.prod.yml down -v
```

### Backup & Restore

**Backup erstellen:**
```bash
# MySQL Backup
docker-compose -f docker-compose.prod.yml exec db mysqldump \
  -u root -p kita_dienstplan > backup_$(date +%Y%m%d).sql

# Uploads/Dateien sichern (falls vorhanden)
docker cp $(docker-compose -f docker-compose.prod.yml ps -q app):/app/uploads ./uploads_backup
```

**Backup wiederherstellen:**
```bash
# MySQL Restore
cat backup_20241215.sql | docker-compose -f docker-compose.prod.yml exec -T db \
  mysql -u root -p kita_dienstplan
```

### Updates

```bash
# 1. Neue Version deployen
./deploy.sh

# 2. Oder manuell:
docker build -f Dockerfile.prod -t kita-dienstplan:latest .
docker-compose -f docker-compose.prod.yml up -d --force-recreate app
```

## 🔒 Sicherheit

### Wichtige Sicherheitsmaßnahmen

1. **Passwörter ändern:**
   - Standardpasswörter in `.env` ändern
   - Admin-Passwort in der Anwendung ändern

2. **Firewall konfigurieren:**
   ```bash
   # Nur benötigte Ports öffnen
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw deny 8000/tcp   # Backend direkt blockieren
   sudo ufw deny 3306/tcp   # MySQL direkt blockieren
   ```

3. **HTTPS aktivieren:**
   - SSL-Zertifikate installieren (Let's Encrypt empfohlen)
   - Nginx HTTPS-Konfiguration aktivieren

4. **Monitoring:**
   ```bash
   # Resource-Monitoring
   docker stats
   
   # Health Checks
   curl -f http://localhost/api/health
   ```

## 🐛 Troubleshooting

### Häufige Probleme

**1. Container startet nicht:**
```bash
# Logs prüfen
docker-compose -f docker-compose.prod.yml logs app

# Ports prüfen
sudo netstat -tulpn | grep :8000
```

**2. Frontend lädt nicht:**
```bash
# Prüfen ob Frontend-Build existiert
ls -la frontend/dist/

# Container rebuild
docker build -f Dockerfile.prod -t kita-dienstplan:latest . --no-cache
```

**3. Datenbankverbindung fehlschlägt:**
```bash
# MySQL Container prüfen
docker-compose -f docker-compose.prod.yml logs db

# Verbindung testen
docker-compose -f docker-compose.prod.yml exec app python -c "
from database import engine
print('DB Connection:', engine.connect())
"
```

**4. Permission-Probleme:**
```bash
# Volume-Permissions prüfen
docker-compose -f docker-compose.prod.yml exec app ls -la /app/

# Owner anpassen falls nötig
sudo chown -R 1000:1000 ./data/
```

## 📈 Performance-Optimierung

### Produktionsoptimierungen

1. **Worker-Anzahl anpassen:**
   ```dockerfile
   # In Dockerfile.prod
   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
   ```

2. **Database Connection Pooling:**
   ```python
   # In database.py
   engine = create_engine(DATABASE_URL, pool_size=20, max_overflow=0)
   ```

3. **Nginx Caching:**
   ```nginx
   # In nginx.conf
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
       expires 1y;
       add_header Cache-Control "public, no-transform";
   }
   ```

## 🔄 CI/CD Integration

Beispiel für automatisches Deployment mit GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy to server
      run: |
        ssh user@server 'cd /opt/kita-dienstplan && git pull && ./deploy.sh'
```

## 📞 Support

Bei Problemen:
1. Logs prüfen: `docker-compose -f docker-compose.prod.yml logs`
2. Health Check: `curl http://localhost/api/health`
3. Container Status: `docker-compose -f docker-compose.prod.yml ps`