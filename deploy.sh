#!/bin/bash

# Kita Dienstplan - Production Deployment Script

set -e  # Exit bei Fehlern

echo "🚀 Kita Dienstplan - Production Deployment"
echo "=========================================="

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funktionen
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Prüfungen vor Deployment
log_info "Prüfe Voraussetzungen..."

# Docker prüfen
if ! command -v docker &> /dev/null; then
    log_error "Docker ist nicht installiert!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose ist nicht installiert!"
    exit 1
fi

log_success "Docker und Docker Compose gefunden"

# Environment-Datei prüfen
if [ ! -f .env ]; then
    log_warning ".env Datei nicht gefunden"
    if [ -f .env.prod ]; then
        log_info "Kopiere .env.prod zu .env"
        cp .env.prod .env
        log_warning "Bitte .env Datei anpassen vor dem nächsten Start!"
    else
        log_error "Keine Environment-Konfiguration gefunden!"
        exit 1
    fi
fi

log_success "Environment-Konfiguration gefunden"

# Frontend Build prüfen/erstellen
log_info "Erstelle Frontend Build..."

if [ ! -d "frontend/node_modules" ]; then
    log_info "Installiere Frontend Dependencies..."
    cd frontend
    npm ci
    cd ..
fi

log_info "Baue Frontend für Production..."
cd frontend
npm run build
cd ..

if [ ! -d "frontend/dist" ]; then
    log_error "Frontend Build fehlgeschlagen!"
    exit 1
fi

log_success "Frontend Build erfolgreich erstellt"

# Production Docker Build
log_info "Erstelle Production Docker Image..."

docker build -f Dockerfile.prod -t kita-dienstplan:latest .

log_success "Docker Image erstellt"

# Alte Container stoppen
log_info "Stoppe alte Container..."
docker-compose -f docker-compose.prod.yml down || true

# Production Container starten
log_info "Starte Production Container..."

# Ohne Nginx
if [ "$1" = "--without-nginx" ]; then
    log_info "Starte ohne Nginx Reverse Proxy"
    docker-compose -f docker-compose.prod.yml up -d app db
else
    log_info "Starte mit Nginx Reverse Proxy"
    docker-compose -f docker-compose.prod.yml --profile with-nginx up -d
fi

# Warten auf Datenbankverbindung
log_info "Warte auf Datenbankverbindung..."
sleep 10

# Initial Setup wird automatisch beim App-Start durchgeführt
log_info "Datenbank wird automatisch beim App-Start initialisiert..."

# Status prüfen
log_info "Prüfe Container Status..."
docker-compose -f docker-compose.prod.yml ps

# Health Check
log_info "Führe Health Check durch..."
sleep 5

if [ "$1" = "--without-nginx" ]; then
    HEALTH_URL="http://localhost:8000/api/health"
else
    HEALTH_URL="http://localhost/api/health"
fi

if curl -f -s $HEALTH_URL > /dev/null; then
    log_success "Health Check erfolgreich"
else
    log_error "Health Check fehlgeschlagen"
    log_info "Container Logs:"
    docker-compose -f docker-compose.prod.yml logs app
    exit 1
fi

# Abschluss
echo ""
log_success "🎉 Deployment erfolgreich abgeschlossen!"
echo ""
echo "📱 Anwendung verfügbar unter:"
if [ "$1" = "--without-nginx" ]; then
    echo "   http://localhost:8000"
else
    echo "   http://localhost"
fi
echo ""
echo "👤 Login:"
echo "   Admin:   admin / admin123"
echo "   Leitung: Manuell erstellen (siehe DEPLOYMENT.md)"
echo ""
echo "🔧 Verwaltung:"
echo "   Logs anzeigen:     docker-compose -f docker-compose.prod.yml logs -f"
echo "   Container stoppen: docker-compose -f docker-compose.prod.yml down"
echo "   Backup erstellen:  docker-compose -f docker-compose.prod.yml exec db mysqldump -u root -p kita_dienstplan > backup.sql"
echo ""
log_warning "Wichtig: Ändere die Standard-Passwörter in der .env Datei!"