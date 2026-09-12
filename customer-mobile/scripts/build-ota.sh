#!/usr/bin/env bash
set -e

# Planet Cinema OTA Bundle Build Script
# Usage: ./scripts/build-ota.sh [bundle_version] [output_dir]

VERSION=${1:-"2"}
OUT_DIR=${2:-"build/ota"}

mkdir -p "$OUT_DIR"

echo "📦 Bundling React Native JavaScript for Android (OTA Version $VERSION)..."

npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output "$OUT_DIR/index.android.v$VERSION.bundle" \
  --assets-dest "$OUT_DIR"

echo "🔒 Generating SHA256 checksum..."
if command -v shasum >/dev/null 2>&1; then
  HASH=$(shasum -a 256 "$OUT_DIR/index.android.v$VERSION.bundle" | awk '{print $1}')
elif command -v sha256sum >/dev/null 2>&1; then
  HASH=$(sha256sum "$OUT_DIR/index.android.v$VERSION.bundle" | awk '{print $1}')
else
  HASH=""
fi

echo "=========================================="
echo "✅ OTA Bundle Generation Complete!"
echo "📁 File: $OUT_DIR/index.android.v$VERSION.bundle"
echo "🔑 SHA256: $HASH"
echo "=========================================="
echo "To publish this release to Express backend:"
echo "curl -X POST http://localhost:8080/api/app-updates/publish \\"
echo "  -H 'Authorization: Bearer <ADMIN_TOKEN>' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"platform\": \"android\", \"appVersion\": \"1.0.0\", \"bundleVersion\": $VERSION, \"bundleHash\": \"$HASH\", \"releaseNotes\": \"Pembaruan sistem & UI\"}'"
echo "=========================================="
