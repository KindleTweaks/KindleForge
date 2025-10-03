#!/bin/sh

set -e

TMPDIR=/mnt/us/KFPM-Temporary
mkdir -p "$TMPDIR"

# Download + Extract
curl -L -o "$TMPDIR/kanki.zip" https://github.com/crizmo/kanki/releases/latest/download/kanki.zip
unzip -q "$TMPDIR/kanki.zip" -d "$TMPDIR"

# Copy Contents
mkdir -p /mnt/us/documents/kanki
cp -r "$TMPDIR/kanki"/* /mnt/us/documents/kanki/
cp "$TMPDIR/kanki.sh" /mnt/us/documents/
chmod +x /mnt/us/documents/kanki.sh

# Cleanup
rm -rf "$TMPDIR"

exit 0