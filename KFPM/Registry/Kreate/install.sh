#!/bin/sh

set -e

TMPDIR=/mnt/us/KFPM-Temporary
mkdir -p "$TMPDIR"

# Download + Extract
curl -L -o "$TMPDIR/kreate.zip" https://github.com/KindleTweaks/KindleForge/raw/refs/heads/master/KFPM/Registry/Kreate/assets/kreate.zip
unzip -q "$TMPDIR/kreate.zip" -d "$TMPDIR"

# First Subfolder
SUBDIR=$(find "$TMPDIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)

# Copy Contents
mkdir -p /mnt/us/documents/kreate
cp -r "$SUBDIR"/* /mnt/us/documents/kreate

# Cleanup
rm -rf "$TMPDIR"

exit 0
