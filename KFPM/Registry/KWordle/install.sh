#!/bin/sh

set -e

TMPDIR=/mnt/us/KFPM-Temporary
mkdir -p "$TMPDIR"

# Download + Extract
curl -L -o "$TMPDIR/kwordle.zip" https://github.com/crizmo/kwordle/releases/latest/download/kwordle.zip
unzip -q "$TMPDIR/kwordle.zip" -d "$TMPDIR"

# Copy Contents
mkdir -p /mnt/us/documents/kwordle
cp -r "$SUBDIR/kwordle"/* /mnt/us/documents/kwordle/
cp "$SUBDIR/kwordle.sh" /mnt/us/documents/
chmod +x /mnt/us/documents/kwordle.sh

# Cleanup
rm -rf "$TMPDIR"

exit 0