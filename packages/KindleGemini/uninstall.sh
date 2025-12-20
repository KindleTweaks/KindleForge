#!/bin/sh
# KindleForge Uninstall Script for KindleGemini

APP_ID="com.baconwillrule.kindlegemini"
APP_DIR="/var/local/mesquite/KindleGemini"
DOC_DIR="/mnt/us/documents"
DB="/var/local/appreg.db"

echo "Uninstalling KindleGemini..."

# 1. Remove App Directory
if [ -d "$APP_DIR" ]; then
    rm -rf "$APP_DIR"
    echo "Removed App Directory."
fi

# 2. Remove Launcher Script
if [ -f "$DOC_DIR/KindleGemini.sh" ]; then
    rm -f "$DOC_DIR/KindleGemini.sh"
    echo "Removed Launcher Script."
fi

# 3. Unregister from AppReg
echo "Deregistering..."
sqlite3 "$DB" <<EOF
DELETE FROM handlerIds WHERE handlerId='$APP_ID';
DELETE FROM properties WHERE handlerId='$APP_ID';
EOF

echo "Uninstallation Complete."
