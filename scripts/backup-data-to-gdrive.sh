#!/usr/bin/env bash
set -euo pipefail

# Weekly mirror backup for data/ to Google Drive via rclone.
#
# Required env:
#   GDRIVE_SERVICE_ACCOUNT_JSON  JSON for a Google service account with Drive access
#   GDRIVE_FOLDER_ID             Target Google Drive folder ID
#
# Optional env:
#   BACKUP_PREFIX=weekly
#   RETAIN_LOCAL=0

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="$ROOT_DIR/data"
STAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
PREFIX="${BACKUP_PREFIX:-weekly}"
ARCHIVE="$ROOT_DIR/.tmp-${PREFIX}-data-${STAMP}.tar.gz"

if [[ -z "${GDRIVE_SERVICE_ACCOUNT_JSON:-}" ]]; then
  echo "GDRIVE_SERVICE_ACCOUNT_JSON is required." >&2
  exit 1
fi
if [[ -z "${GDRIVE_FOLDER_ID:-}" ]]; then
  echo "GDRIVE_FOLDER_ID is required." >&2
  exit 1
fi
if ! command -v rclone >/dev/null 2>&1; then
  echo "rclone is required for Google Drive backup." >&2
  exit 1
fi

RCLONE_CONFIG_DIR="$(mktemp -d)"
SA_FILE="$RCLONE_CONFIG_DIR/service-account.json"
printf "%s" "$GDRIVE_SERVICE_ACCOUNT_JSON" > "$SA_FILE"

cleanup() {
  rm -rf "$RCLONE_CONFIG_DIR"
  if [[ "${RETAIN_LOCAL:-0}" != "1" ]]; then
    rm -f "$ARCHIVE"
  fi
}
trap cleanup EXIT

echo "Creating archive: $ARCHIVE"
tar -C "$ROOT_DIR" -czf "$ARCHIVE" data

REMOTE="gdrive"
rclone config create "$REMOTE" drive \
  scope drive.file \
  service_account_file "$SA_FILE" \
  root_folder_id "$GDRIVE_FOLDER_ID" \
  config_is_local false >/dev/null

echo "Uploading archive to Google Drive archives/ ..."
rclone copy "$ARCHIVE" "$REMOTE:archives/" --create-empty-src-dirs

echo "Syncing latest mirror to Google Drive latest/ ..."
rclone sync "$DATA_DIR" "$REMOTE:latest/" --delete-during

echo "Google Drive backup complete."
