#!/bin/bash
set -e

# Ensure we are in the project root
cd "$(dirname "$0")/.."

echo "🚀 Starting Release Build Process..."

# 1. Build Web Assets
echo "📦 Building web assets..."
pnpm build

# 2. Sync with Capacitor
echo "🔄 Syncing Capacitor..."
npx cap sync android

# 3. Build Android Bundle
echo "🤖 Building Android App Bundle..."
cd android

# Check for keystore
KEYSTORE_FILE="app/release-key.keystore"
if [ ! -f "$KEYSTORE_FILE" ]; then
    echo "⚠️  No keystore found at android/$KEYSTORE_FILE"
    echo "Please run ./scripts/generate-keystore.sh first or place your keystore there."
    exit 1
fi

echo "🔑 You will be prompted for your keystore password."
read -s -p "Enter Keystore Password: " KEYSTORE_PASS
echo
read -p "Enter Key Alias (default: key0): " KEY_ALIAS
KEY_ALIAS=${KEY_ALIAS:-key0}
read -s -p "Enter Key Password (leave empty if same as keystore password): " KEY_PASS
echo
KEY_PASS=${KEY_PASS:-$KEYSTORE_PASS}

# Clean and Build with signing properties
./gradlew clean bundleRelease \
  -PRELEASE_STORE_FILE="release-key.keystore" \
  -PRELEASE_STORE_PASSWORD="$KEYSTORE_PASS" \
  -PRELEASE_KEY_ALIAS="$KEY_ALIAS" \
  -PRELEASE_KEY_PASSWORD="$KEY_PASS"

echo "✅ Build Complete!"
echo "📂 Release Bundle: android/app/build/outputs/bundle/release/app-release.aab"
echo "👉 Upload this file to the Google Play Console."
