#!/usr/bin/env bash
# MySQL Backup & Restore Utility for AI Finance Manager (Bash / Linux / macOS)
# Usage:
#   ./scripts/db-backup-restore.sh backup ./backup.sql
#   ./scripts/db-backup-restore.sh restore ./backup.sql

set -euo pipefail

ACTION="${1:-}"
FILE_PATH="${2:-backup_$(date +%Y%m%d_%H%M%S).sql}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-ai_finance_manager}"

echo "=========================================================="
echo " AI Finance Manager — Database Backup & Recovery Utility"
echo "=========================================================="

if [ "$ACTION" == "backup" ]; then
    echo "Creating backup of database '$DB_NAME' to '$FILE_PATH'..."
    mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p \
      --single-transaction \
      --quick \
      --routines \
      --triggers \
      "$DB_NAME" > "$FILE_PATH"
    echo "Database backup successfully saved to: $FILE_PATH"

elif [ "$ACTION" == "restore" ]; then
    if [ ! -f "$FILE_PATH" ]; then
        echo "Error: File '$FILE_PATH' does not exist." >&2
        exit 1
    fi
    echo "WARNING: Restoring will overwrite existing data in '$DB_NAME'!"
    read -rp "Are you sure you want to proceed? (y/N): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo "Restore operation canceled."
        exit 0
    fi
    echo "Restoring database from '$FILE_PATH'..."
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < "$FILE_PATH"
    echo "Database successfully restored from: $FILE_PATH"

else
    echo "Usage:"
    echo "  $0 backup [output_file.sql]"
    echo "  $0 restore <input_file.sql>"
    exit 1
fi
