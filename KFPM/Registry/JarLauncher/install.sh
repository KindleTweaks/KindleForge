#!/bin/sh

set -e

TMPDIR=/mnt/us/KFPM-Temporary
mkdir -p "$TMPDIR"

# Download + Extract
curl -L -o "$TMPDIR/JarLauncher.zip" https://github.com/ThatPotatoDev/JarLauncher/releases/latest/download/JarLauncher.zip
unzip -q "$TMPDIR/JarLauncher.zip" -d "$TMPDIR"

# Copy Contents
mkdir -p /mnt/us/extensions/JarLauncher
cp -r "$TMPDIR"/* /mnt/us/extensions/JarLauncher

# Cleanup
rm -rf "$TMPDIR"

exit 0
