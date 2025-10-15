#!/bin/sh

set -e

TMPDIR=/mnt/us/KFPM-Temporary
mkdir -p "$TMPDIR"

if [ -f /lib/ld-linux-armhf.so.3 ]; then
  LINK="https://www.mobileread.com/forums/attachment.php?attachmentid=216964&d=1752870631" # Hard Float
else
  LINK="https://www.mobileread.com/forums/attachment.php?attachmentid=216965&d=1752870631" # Soft Float
fi

# Download
curl -fSL --progress-bar -o $TMPDIR/sox.zip $LINK
unzip -q "$TMPDIR/sox.zip" -d /mnt/us

# Cleanup
rm -rf $TMPDIR

exit 0