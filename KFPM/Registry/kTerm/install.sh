#!/bin/sh

set -e

TMPDIR=/mnt/us/KFPM-Temporary
mkdir -p "$TMPDIR"

PACKAGE="https://github.com/bfabiszewski/kterm/releases/download/v2.6/kterm-kindle-2.6-armhf.zip"

if [ -f /lib/ld-linux-armhf.so.3 ]; then
  # Hard Float
else
  # Soft Float
  PACKAGE="https://github.com/bfabiszewski/kterm/releases/download/v2.6/kterm-kindle-2.6.zip"
fi

# Download + Extract
curl -L -o "$TMPDIR/kterm.zip" $PACKAGE
unzip -q "$TMPDIR/kterm.zip" -d "$TMPDIR"

# First Subfolder
SUBDIR=$(find "$TMPDIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)

# Copy Contents
mkdir -p /mnt/us/extensions/kterm
cp -r "$SUBDIR"/* /mnt/us/extensions/kterm

# Cleanup
rm -rf $TMPDIR

exit 0