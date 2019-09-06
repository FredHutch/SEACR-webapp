#!/bin/bash

# APP_SECRET=$(cat /run/secrets/BATCH_DASHBOARD_APP_SECRET)
# export APP_SECRET

VENV=$(pipenv --venv)

# TODO FIXME - allow other env vars to be set in environment
# when not using rancher.

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
    RECAPTCHA_SECRET_KEY=$(cat /run/secrets/SEACR_RECAPTCHA_SECRET_KEY)
    ISSUE_EMAIL_RECIPIENTS=$(cat /run/secrets/SEACR_ISSUE_EMAIL_RECIPIENTS)
    EMAIL_SERVER=$(cat /run/secrets/SEACR_EMAIL_SERVER)
fi

export SECRET_KEY
export RECAPTCHA_SECRET_KEY
export ISSUE_EMAIL_RECIPIENTS
export EMAIL_SERVER



"$VENV/bin/gunicorn" app:APP --timeout 2000 -w 4 -b 0.0.0.0:8001
