#!/bin/sh

set -e

# Download + Extract
mkdir -p /mnt/us/KFPM
curl -L -o /mnt/us/KFPM/GnomeGames.zip https://github.com/crazy-electron/GnomeGames4Kindle/releases/latest/download/gnomegames.zip 
unzip -q /mnt/us/KFPM/GnomeGames.zip -d /mnt/us/KFPM/
mkdir -p /mnt/us/extensions/GnomeGames
cp -r /mnt/us/KFPM/GnomeGames/* /mnt/us/extensions/GnomeGames

# Scriptlets
cp -f /mnt/us/extensions/GnomeGames/shortcut_gnomechess.sh /mnt/us/documents
cp -f /mnt/us/extensions/GnomeGames/shortcut_gnomine.sh /mnt/us/documents

rm -rf /mnt/us/KFPM

exit 0
