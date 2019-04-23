#!/bin/bash

APP_SECRET=$(cat /run/secrets/BATCH_DASHBOARD_APP_SECRET)
export APP_SECRET

VENV=$(pipenv --venv)

"$VENV/bin/gunicorn" app:APP --timeout 120 -w 4 -b 0.0.0.0:8001
