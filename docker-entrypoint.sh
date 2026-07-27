#!/bin/sh
set -e

mkdir -p /app/data /app/backups /app/logs
chown -R nodejs:nodejs /app/data /app/backups /app/logs 2>/dev/null || true

exec "$@"
