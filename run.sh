#!/bin/bash

# APP_SECRET=$(cat /run/secrets/BATCH_DASHBOARD_APP_SECRET)
# export APP_SECRET

VENV=$(pipenv --venv)

if [ ! -f /run/secrets/SEACR_APP_SECRET ]; then
    echo "/run/secrets/SEACR_APP_SECRET does not exist."
    if [ -z ${SEACR_APP_SECRET+x} ]; then
        echo "SEACR_APP_SECRET is unset, using insecure secret!"
        SECRET_KEY="this is not secure at all"
    else 
        echo "SECRET_KEY is set to the value of SEACR_APP_SECRET"
        SECRET_KEY=$SEACR_APP_SECRET
    fi
else
    echo "Setting SECRET_KEY to contents of /run/secrets/SEACR_APP_SECRET."
    SECRET_KEY=$(cat /run/secrets/SEACR_APP_SECRET)
fi

export SECRET_KEY


"$VENV/bin/gunicorn" app:APP --timeout 120 -w 4 -b 0.0.0.0:8001
