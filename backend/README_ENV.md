# Environment Configuration

Die Umgebungsvariablen für das Backend befinden sich in der **Root `.env`** Datei:

```
../env.example  → Kopiere zu ../.env
```

## Warum Root-Level?

Die `.env` Datei im Root-Verzeichnis enthält sowohl:
- **Docker-Compose** Variablen (MySQL-Passwörter)
- **Backend-App** Variablen (JWT, E-Mail, Push Notifications)

Dies vereinfacht die Konfiguration und vermeidet Duplikate.

## Verwendung:

1. **Development:**
   ```bash
   cp ../.env.example ../.env
   # Bearbeite ../.env mit deinen Werten
   docker-compose up
   ```

2. **Production:**
   ```bash
   cp ../.env.example ../.env.prod
   # Bearbeite ../.env.prod mit Production-Werten
   docker-compose -f docker-compose.prod.yml up
   ```

## Wichtige Variablen für Backend:

- `DATABASE_URL` - Datenbankverbindung
- `SECRET_KEY` - JWT Schlüssel (ÄNDERN in Production!)
- `SMTP_*` - E-Mail-Konfiguration
- `VAPID_*` - Push Notification Keys
- `CORS_ORIGINS` - Erlaubte Frontend-URLs