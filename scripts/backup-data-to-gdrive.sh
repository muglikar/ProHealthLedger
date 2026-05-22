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

if ! command -v rclone >/dev/null 2>&1; then
  echo "rclone is required for Google Drive backup." >&2
  exit 1
fi

RCLONE_CONFIG_DIR="$(mktemp -d)"
RCLONE_CONF_FILE="$RCLONE_CONFIG_DIR/rclone.conf"
REMOTE="gdrive"

cleanup() {
  rm -rf "$RCLONE_CONFIG_DIR"
  if [[ "${RETAIN_LOCAL:-0}" != "1" ]]; then
    rm -f "$ARCHIVE"
  fi
}
trap cleanup EXIT

if [[ -n "${RCLONE_CONFIG_DATA:-}" ]]; then
  echo "Using direct rclone config data from secrets..."
  printf "%s\n" "$RCLONE_CONFIG_DATA" > "$RCLONE_CONF_FILE"
  
  if [[ -n "${GDRIVE_FOLDER_ID:-}" ]]; then
    echo "Configuring target folder ID: $GDRIVE_FOLDER_ID"
    printf "\nroot_folder_id = %s\n" "$GDRIVE_FOLDER_ID" >> "$RCLONE_CONF_FILE"
  fi
  
  export RCLONE_CONFIG="$RCLONE_CONF_FILE"
else
  if [[ -z "${GDRIVE_SERVICE_ACCOUNT_JSON:-}" ]]; then
    echo "Either RCLONE_CONFIG_DATA or GDRIVE_SERVICE_ACCOUNT_JSON is required." >&2
    exit 1
  fi
  if [[ -z "${GDRIVE_FOLDER_ID:-}" ]]; then
    echo "GDRIVE_FOLDER_ID is required." >&2
    exit 1
  fi
  
  SA_FILE="$RCLONE_CONFIG_DIR/service-account.json"
  printf "%s" "$GDRIVE_SERVICE_ACCOUNT_JSON" > "$SA_FILE"
  
  rclone config create "$REMOTE" drive \
    scope drive.file \
    service_account_file "$SA_FILE" \
    root_folder_id "$GDRIVE_FOLDER_ID" \
    config_is_local false >/dev/null
  
  export RCLONE_CONFIG="$RCLONE_CONFIG_DIR/rclone_generated.conf"
fi

HUMAN_SIZE="$(du -sh "$DATA_DIR" | cut -f1)"
if [[ "$HUMAN_SIZE" == *K ]]; then
  SIZE_SUFFIX="${HUMAN_SIZE%K}KB"
elif [[ "$HUMAN_SIZE" == *M ]]; then
  SIZE_SUFFIX="${HUMAN_SIZE%M}MB"
elif [[ "$HUMAN_SIZE" == *G ]]; then
  SIZE_SUFFIX="${HUMAN_SIZE%G}GB"
else
  SIZE_SUFFIX="${HUMAN_SIZE}"
fi

STAMP_DIR="$(TZ="Asia/Kolkata" date +"%Y-%m-%d_%H-%M-%S")_${SIZE_SUFFIX}"

echo "Creating archive: $ARCHIVE"
tar -C "$ROOT_DIR" -czf "$ARCHIVE" data

CLEAN_ARCHIVE_NAME="weekly-data-${STAMP_DIR}.tar.gz"
mv "$ARCHIVE" "$ROOT_DIR/$CLEAN_ARCHIVE_NAME"
ARCHIVE="$ROOT_DIR/$CLEAN_ARCHIVE_NAME"

echo "Uploading archive to Google Drive archives/ ..."
rclone copy "$ARCHIVE" "$REMOTE:archives/" --create-empty-src-dirs

echo "Syncing date-time wise mirror to Google Drive ${STAMP_DIR}/ ..."
rclone sync "$DATA_DIR" "$REMOTE:${STAMP_DIR}/" --delete-during

echo "Google Drive backup complete."
