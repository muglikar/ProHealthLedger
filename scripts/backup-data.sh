#!/usr/bin/env bash
set -euo pipefail

# Periodic mirror backup for data/ to a private bucket.
#
# Usage:
#   PRIVATE_BACKUP_BUCKET=s3://my-private-bucket/prohealthledger ./scripts/backup-data.sh
# Optional:
#   BACKUP_PREFIX=nightly
#   RETAIN_LOCAL=1   # keep local tarball

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$ROOT_DIR/data"
STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
PREFIX="${BACKUP_PREFIX:-manual}"
ARCHIVE="$ROOT_DIR/.tmp-${PREFIX}-data-${STAMP}.tar.gz"
DEST="${PRIVATE_BACKUP_BUCKET:-}"

if [[ -z "$DEST" ]]; then
  echo "PRIVATE_BACKUP_BUCKET is required (example: s3://bucket/path)." >&2
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "aws CLI is required for bucket backup." >&2
  exit 1
fi

echo "Creating archive: $ARCHIVE"
tar -C "$ROOT_DIR" -czf "$ARCHIVE" data

echo "Uploading archive to $DEST ..."
aws s3 cp "$ARCHIVE" "$DEST/archives/$(basename "$ARCHIVE")"

echo "Syncing latest mirror to $DEST/latest/ ..."
aws s3 sync "$DATA_DIR" "$DEST/latest/" --delete

echo "Backup complete."

if [[ "${RETAIN_LOCAL:-0}" != "1" ]]; then
  rm -f "$ARCHIVE"
fi

