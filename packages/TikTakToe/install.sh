#!/bin/sh

# Define installation path
INSTALL_DIR="/mnt/us/extensions/TikTakToe"

# Create directory
mkdir -p "$INSTALL_DIR"

# Copy files
cp -r bin/ "$INSTALL_DIR/"
cp metadata.json "$INSTALL_DIR/"
cp README.md "$INSTALL_DIR/"

# Set executable permissions
chmod +x "$INSTALL_DIR/bin/tictactoe.py"

echo "TikTakToe installed successfully."
