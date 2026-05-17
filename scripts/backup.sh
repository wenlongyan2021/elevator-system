#!/bin/bash
set -e

BACKUP_DIR=${BACKUP_DIR:-"/share/ElevatorSystem/backups"}
DB_NAME=${DB_NAME:-"elevator_system"}
DB_USER=${DB_USER:-"elevator"}
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "=== Elevator System Backup: $DATE ==="

# Backup PostgreSQL
echo "Backing up PostgreSQL..."
docker exec elevator-postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"
echo "  -> db_$DATE.sql.gz ($(du -h "$BACKUP_DIR/db_$DATE.sql.gz" | cut -f1))"

# Backup uploads
echo "Backing up uploads..."
tar czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C "$(docker volume inspect elevator_uploads --format '{{.Mountpoint}}')" .
echo "  -> uploads_$DATE.tar.gz"

# Clean old backups (keep 30 days)
echo "Cleaning backups older than 30 days..."
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +30 -delete

echo "=== Backup completed ==="
echo "Total backup size: $(du -sh "$BACKUP_DIR" | cut -f1)"
