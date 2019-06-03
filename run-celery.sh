#!/bin/bash


VENV=$(pipenv --venv)

"$VENV/bin/celery" -A tasks worker --loglevel=info
