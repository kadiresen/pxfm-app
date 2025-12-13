#!/bin/bash
set -e

KEYSTORE_PATH="android/app/release-key.keystore"
ALIAS="key0"

echo "🔐 Generating Android Release Keystore..."

if [ -f "$KEYSTORE_PATH" ]; then
    echo "⚠️  Keystore already exists at $KEYSTORE_PATH."
    read -p "Do you want to overwrite it? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborting."
        exit 1
    fi
fi

echo "Please answer the following questions to generate your key."
echo "Ensure you remember the password you choose!"

keytool -genkey -v -keystore "$KEYSTORE_PATH" -alias "$ALIAS" -keyalg RSA -keysize 2048 -validity 10000

echo "✅ Keystore generated at $KEYSTORE_PATH"
echo "save this file securely!"
