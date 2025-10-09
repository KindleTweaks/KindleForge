#!/bin/sh
# Name: Toggle ADs
# Author: Marek, Penguins

DB="/var/local/appreg.db"
STATE=$(sqlite3 "$DB" 'select value from properties where name = "adunit.viewable";')

if [ "$STATE" = "true" ]; then
    echo "Ads are currently ENABLED."
    echo "Disabling ads..."
    echo "Removing adunits folder..."
    rm -rf /var/local/adunits
    echo "Removing ad assets..."
    rm -rf /mnt/us/.assets
    echo "Updating appreg.db..."
    sqlite3 "$DB" 'update properties set value = "false" where name = "adunit.viewable";'
    echo "Ads disabled. Rebooting in 5 seconds..."
    sleep 5
    reboot
else
    echo "Ads are currently DISABLED."
    echo "Re-enabling ads..."
    sqlite3 "$DB" 'update properties set value = "true" where name = "adunit.viewable";'
    echo "Ads enabled. Rebooting in 5 seconds..."
    sleep 5
    reboot
fi