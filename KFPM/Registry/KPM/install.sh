#!/bin/sh

set -e

sh -c "$(curl -fSL --progress-bar https://raw.githubusercontent.com/gingrspacecadet/kpm/main/install-kpm.sh)"

# Finish
exit 0