#!/bin/bash

# called by /etc/cron.d/clean-old-jobs

echo "directory /seacr-data/$1 is more than 30 days old, deleting it."

rm -rf "/seacr-data/$1"

