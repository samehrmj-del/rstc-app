#!/bin/sh
set -e

fix_dir() {
    dir="$1"
    if [ -d "$dir" ]; then
        chown -R nodejs:nodejs "$dir" 2>/dev/null || true
        chmod -R 777 "$dir" 2>/dev/null || true
    fi
}

fix_dir "/app/data"
fix_dir "/app/backups"
fix_dir "/app/logs"
fix_dir "/data"
fix_dir "/backups"
fix_dir "/logs"

mkdir -p "/data" 2>/dev/null || true
fix_dir "/data"

exec "$@"