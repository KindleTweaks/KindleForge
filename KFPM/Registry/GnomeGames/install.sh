#!/bin/sh

set -e

TMPDIR=/mnt/us/KFPM
mkdir -p "$TMPDIR"

# Download + Extract
curl -L -o "$TMPDIR/GnomeGames.zip" https://github.com/crazy-electron/GnomeGames4Kindle/releases/latest/download/gnomegames.zip
unzip -q "$TMPDIR/GnomeGames.zip" -d "$TMPDIR"

# First Subfolder
SUBDIR=$(find "$TMPDIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)

# Copy Contents
mkdir -p /mnt/us/extensions/GnomeGames
cp -r "$SUBDIR"/* /mnt/us/extensions/GnomeGames

# Scriptlets
cp -f /mnt/us/extensions/GnomeGames/shortcut_gnomechess.sh /mnt/us/documents
cp -f /mnt/us/extensions/GnomeGames/shortcut_gnomine.sh /mnt/us/documents

# Cleanup
rm -rf "$TMPDIR"

exit 0
