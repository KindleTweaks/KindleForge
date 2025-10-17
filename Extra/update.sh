#!/bin/sh

set -e

TMPDIR=/mnt/us/KF-Update-Temp
mkdir -p "$TMPDIR"

# Download + Extract
curl -L -o "$TMPDIR/KindleForge.zip" https://github.com/KindleTweaks/KindleForge/releases/latest/download/KindleForge.zip
unzip -q "$TMPDIR/KindleForge.zip" -d "$TMPDIR"

# Out With The Old
rm -rf /mnt/us/documents/KindleForge
rm -f /mnt/us/documents/KindleForge.sh

# In With The New
cp -r "$TMPDIR"/* /mnt/us/documents/

# Just In Case
sync
sleep 1

# Cleanup
rm -rf "$TMPDIR"

# Homescreen, Kill Mesquite

lipc-set-prop com.lab126.appmgrd start app://com.lab126.booklet.home
killall mesquite

exit 0
