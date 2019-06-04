#!/bin/bash

# called by /etc/cron.d/clean-old-jobs

echo "job directory /jobs/$1 is more than 30 days old, deleting it."

rm -rf "/jobs/$1"

