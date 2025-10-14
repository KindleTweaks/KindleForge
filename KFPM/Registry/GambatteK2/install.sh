#!/bin/sh

set -e

TMPDIR=/mnt/us/KFPM-Temporary
mkdir -p "$TMPDIR"

# Download + Extract
curl -fSL --progress-bar -o "$TMPDIR/gambatte-k2.zip" https://github.com/crazy-electron/gambatte-k2/releases/latest/download/gambatte-k2.zip
unzip -q "$TMPDIR/gambatte-k2.zip" -d "$TMPDIR"

# First Subfolder
SUBDIR=$(find "$TMPDIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)

# Copy Contents
mkdir -p /mnt/us/extensions/gambatte-k2
cp -r "$SUBDIR"/* /mnt/us/extensions/gambatte-k2

# Download Scriptlet
curl -fSL --progress-bar -o /mnt/us/documents/gambatte-k2.sh https://raw.githubusercontent.com/KindleTweaks/KindleForge/refs/heads/master/KFPM/Registry/GambatteK2/assets/gambatte-k2.sh

# Cleanup
rm -rf "$TMPDIR"

exit 0
