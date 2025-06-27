# Database Setup & Initialization

This document describes how to set up and initialize the MySQL database for the Kita Dienstplan application.

## 🗄️ Database Overview

The application uses **MySQL 8.0** as the primary database with the following configuration:
- **Database**: `kita_dienstplan`
- **User**: `kita_user`
- **Host**: `db` (Docker container name)
- **Port**: `3306`

## 🚀 Quick Start (Development)

### 1. Environment Configuration

Copy the environment template:
```bash
cp .env.example .env
```

Ensure your `.env` file contains:
```bash
# Database credentials
MYSQL_PASSWORD=secure_database_password_change_me
MYSQL_ROOT_PASSWORD=secure_root_password_change_me

# Backend database connection
DATABASE_URL=mysql+pymysql://kita_user:${MYSQL_PASSWORD}@db:3306/kita_dienstplan
```

### 2. Start the Application

```bash
# Start all services
docker-compose up --build

# Or in detached mode
docker-compose up --build -d
```

### 3. Automatic Initialization

The backend automatically:
- ✅ **Waits for MySQL** to be ready (with health checks)
- ✅ **Creates all database tables** using SQLAlchemy models
- ✅ **Creates default users** if they don't exist:
  - **Admin**: `admin` / `admin123` (Full access)
  - **Leitung**: `leitung` / `leitung123` (Management access)

## 🔧 Manual Database Operations

### Connect to MySQL Container

```bash
# Using MySQL client in container
docker-compose exec db mysql -u root -p kita_dienstplan

# Or connect from host (requires MySQL client)
mysql -h localhost -P 3306 -u kita_user -p kita_dienstplan
```

### Check Database Status

```bash
# Container health
docker-compose ps

# Backend logs (shows database connection)
docker-compose logs backend

# Database logs
docker-compose logs db
```

### Reset Database

```bash
# Stop containers and remove volumes (⚠️ DELETES ALL DATA)
docker-compose down -v

# Start fresh
docker-compose up --build
```

## 🏗️ Database Schema

The application creates the following tables automatically:

### Core Tables
- **`users`** - User accounts with roles (Admin, Leitung, Fachkraft)
- **`time_entries`** - Time tracking entries with automatic prep time calculation
- **`child_counts`** - Child count tracking by time slots
- **`global_events`** - System-wide events (closures, holidays)
- **`monthly_locks`** - Month-end lockdown for time entries

### Feature Tables
- **`push_subscriptions`** - Web push notification subscriptions
- **`push_notifications`** - Push notification history
- **`export_logs`** - Import/export operation logs

### Relationships
```
users (1) → (N) time_entries
users (1) → (N) child_counts  
users (1) → (N) push_subscriptions
users (1) → (N) monthly_locks
```

## 👥 Default Users

| Username | Password | Role | Description |
|----------|----------|------|-------------|
| `admin` | `admin123` | Admin | Full system access, user management |
| `leitung` | `leitung123` | Leitung | Management access, all employee data |

### User Configuration
- **Admin**: 40h/week, 0h additional, 5 days/week, 30 vacation days
- **Leitung**: 30h/week, 14.1875h additional, 5 days/week, 32 vacation days

## 🔐 Security & Production

### Change Default Passwords

1. **Update Environment Variables**:
```bash
# .env
MYSQL_PASSWORD=your_secure_database_password
MYSQL_ROOT_PASSWORD=your_secure_root_password
SECRET_KEY=your-super-secure-jwt-key-with-at-least-32-characters
```

2. **Change User Passwords** (via frontend or API):
```bash
# Example: Change admin password via API
curl -X PUT "http://localhost:8000/api/users/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password": "new_secure_password"}'
```

### Database Backup

```bash
# Create backup
docker-compose exec db mysqldump -u root -p kita_dienstplan > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup_20241227.sql | docker-compose exec -T db mysql -u root -p kita_dienstplan
```

## 🐛 Troubleshooting

### Database Connection Issues

1. **Check Environment Variables**:
```bash
docker-compose exec backend env | grep DATABASE_URL
docker-compose exec backend env | grep MYSQL_PASSWORD
```

2. **Verify Database Logs**:
```bash
docker-compose logs db
```

3. **Test Connection**:
```bash
docker-compose exec backend python -c "
from database import engine
try:
    with engine.connect() as conn:
        print('✅ Database connection successful')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
"
```

### Authentication Errors

```bash
# MySQL authentication error (1045)
# Solution: Check MYSQL_PASSWORD matches in .env and docker-compose.yml

# Connection refused (2003)
# Solution: Wait for MySQL healthcheck, check container status
```

### Table Creation Issues

```bash
# Check if tables exist
docker-compose exec db mysql -u kita_user -p kita_dienstplan -e "SHOW TABLES;"

# Recreate tables (⚠️ deletes data)
docker-compose exec backend python -c "
from database import engine
from models import Base
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
print('✅ Tables recreated')
"
```

## 🔄 Migration & Updates

### Schema Changes

The application uses **SQLAlchemy** for automatic table creation. For production migrations:

1. **Install Alembic** (optional for complex migrations):
```bash
pip install alembic
alembic init migrations
```

2. **Manual Schema Updates** (simple approach):
```bash
# Tables are automatically updated on container restart
docker-compose restart backend
```

### Data Migration

```bash
# Export data before updates
docker-compose exec backend python -c "
from routers.export_import import export_all_data
export_all_data('backup_before_migration.xlsx')
"

# Import data after updates
# Use frontend upload or API endpoint
```

## 📊 Performance Optimization

### Database Configuration

```bash
# Optional: Add to docker-compose.yml db service
environment:
  - MYSQL_INNODB_BUFFER_POOL_SIZE=512M
  - MYSQL_MAX_CONNECTIONS=200
```

### Connection Pooling

Database connections are optimized in `database.py`:
```python
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,      # Verify connections before use
    pool_recycle=3600        # Recycle connections every hour
)
```

## 📈 Monitoring

### Health Checks

```bash
# Database health
docker-compose exec db mysqladmin ping -h localhost -u root -p

# Application health
curl http://localhost:8000/docs
```

### Resource Usage

```bash
# Container stats
docker stats

# Database size
docker-compose exec db mysql -u root -p -e "
SELECT 
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables 
WHERE table_schema = 'kita_dienstplan'
GROUP BY table_schema;
"
```

This setup ensures a robust, scalable database foundation for the Kita Dienstplan application with proper initialization, security, and maintenance procedures.