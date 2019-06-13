#!/usr/bin/env python3

"utility functions"

import os


def on_docker():
    "determine whether we are on docker or not"
    if not os.path.isdir("/proc"):
        return False
    with open("/proc/1/cgroup") as flh:
        lines = flh.readlines()
    docker = [x for x in lines if "/docker/" in x]
    return len(docker) > 0


def get_rabbit_host():
    "get rabbit host"
    if on_docker():
        return "rabbitmq"
    else:
        return "localhost"


def get_job_directory():
    "get job directory"
    if on_docker():
        dir0 = "/seacr-data/jobs/"
        os.makedirs(dir0, exist_ok=True)
        return dir0
    return os.path.abspath("jobs/")

def get_base_upload_directory():
    "get base upload directory"
    if on_docker():
        dir0 = "/seacr-data/uploads/"
        os.makedirs(dir0, exist_ok=True)
        return dir0
    return os.path.abspath("data/")
