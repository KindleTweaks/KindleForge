#!/bin/sh

set -e

TMPDIR=/mnt/us/KFPM-Temporary
mkdir -p "$TMPDIR"

# Download + Extract
curl -fSL --progress-bar -o "$TMPDIR/textadept.zip" https://github.com/kbarni/textadept-kindle/releases/latest/download/textadept.zip
unzip -q "$TMPDIR/textadept.zip" -d /mnt/us

# Cleanup
rm -rf "$TMPDIR"

exit 0
