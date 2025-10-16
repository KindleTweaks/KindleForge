#!/bin/sh

set -e

TMPDIR=/mnt/us/KFPM-Temporary
mkdir -p "$TMPDIR"

if [ -f /lib/ld-linux-armhf.so.3 ]; then
  URL="https://www.mobileread.com/forums/attachment.php?attachmentid=214325&d=1741982302" # ZIP, HF

  curl -fSL --progress-bar -o "$TMPDIR/gargoyle.zip" $URL
  unzip -q "$TMPDIR/gargoyle.zip" -d "$TMPDIR"

  # First Subfolder
  SUBDIR=$(find "$TMPDIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)

  # Copy Contents
  mkdir -p /mnt/us/extensions/gargoyle
  cp -r "$SUBDIR"/* /mnt/us/extensions/gargoyle
else
  URL="https://www.mobileread.com/forums/attachment.php?attachmentid=168543&d=1545424119" # TGZ, SF

  curl -fSL --progress-bar -o "$TMPDIR/gargoyle.tar.gz" $URL
  tar -xzf "$TMPDIR/gargoyle.tar.gz" -C "$TMPDIR"

  # First Subfolder
  SUBDIR=$(find "$TMPDIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)

  # Copy Contents
  mkdir -p /mnt/us/extensions/gargoyle
  cp -r "$SUBDIR"/* /mnt/us/extensions/gargoyle
fi

# Cleanup
rm -rf $TMPDIR

exit 0