"""
Celery tasks
"""

import io
from multiprocessing.pool import ThreadPool
import os

# import threading
import time


from celery import Celery
from celery.utils.log import get_task_logger
import sh

LOGGER = get_task_logger(__name__)

APP = Celery("tasks", backend="rpc://", broker="pyamqp://guest@localhost//")

# APP = Celery("tasks", backend="rpc://", broker="pyamqp://guest@fieldroast//")


@APP.task
def add(arg1, arg2):
    "sample task"
    return arg1 + arg2


@APP.task(bind=True)
def test(self, name):
    "test bound task"
    LOGGER.info("task id is %s", self.request.id)
    return "Hello, {}, your task ID is {}.".format(name, self.request.id)


@APP.task(bind=True)
def run_seacr(self, file1, file2, threshold, normnon, unionauc, output_prefix):
    "run seacr"
    # TODO change to unique temp dir based on task id
    LOGGER.info("task id is %s", self.request.id)
    args = [file1]
    if threshold:
        args.append(threshold)
    else:
        args.append(file2)
    args.append(normnon)
    args.append(unionauc)
    args.append(output_prefix)
    err = io.StringIO()
    out = io.StringIO()
    # LC_ALL needs to be set to C on mac (only, I think) or `tr` will
    # complain of `illegal byte sequence` (https://unix.stackexchange.com/a/141423/64811)
    env = {}
    if os.uname()[0] == "Darwin":
        env["LC_ALL"] = "C"
    kwargs = dict(_err=err, _out=out, _env=env)
    seacr = sh.Command("SEACR/SEACR_1.0.sh")
    pool = ThreadPool(processes=1)
    async_result = pool.apply_async(seacr, args, kwargs)
    while not async_result.ready():
        # thr = threading.Thread(target=seacr, args=args, kwargs=kwargs)
        # TODO get the return value, the below won't work
        # maybe try https://stackoverflow.com/a/14299004/470769
        # return_value = thr.start()
        # while thr.is_alive():
        # TODO only show new output each time through the loop
        # TODO send a custom task status here
        print("OUT: {}".format(out.getvalue()))
        print("ERR: {}".format(err.getvalue()))
        time.sleep(0.2)
    print("done")
    retval = async_result.get().exit_code
    print("return value is {}".format(retval))
    return retval


if __name__ == "__main__":
    run_seacr(
        None,  # this won't work... TODO create mock object?
        "NPATBH.spike_Ec.bedgraph",
        "IgGBH.spike_Ec.bedgraph",
        None,
        "norm",
        "AUC",
        "SH_Hs_NPATBH.spike_Ec_IgGBH.spike_Ec",
    )
