"""
Celery tasks
"""

import datetime
import io
from multiprocessing.pool import ThreadPool
import os
import sys

# import threading
import time


from celery import Celery
from celery.utils.log import get_task_logger
import sh

LOGGER = get_task_logger(__name__)

APP = Celery("tasks", backend="rpc://", broker="pyamqp://guest@localhost//")

# APP = Celery("tasks", backend="rpc://", broker="pyamqp://guest@fieldroast//")

err = io.StringIO()
out = io.StringIO()


@APP.task
def add(arg1, arg2):
    "sample task"
    return arg1 + arg2


@APP.task
def waity(secs):
    "waity task"
    time.sleep(secs)
    return secs

@APP.task(bind=True)
def test(self, name):
    "test bound task"
    LOGGER.info("task id is %s", self.request.id)
    return "Hello, {}, your task ID is {}.".format(name, self.request.id)


def seacr_wrapper(*args, **kwargs):
    "wrapper"
    try:
        seacr = sh.Command(kwargs['seacr_command'])
        del kwargs['seacr_command']
        result = seacr(*args, **kwargs)
        LOGGER.info("success!")
        return (result.exit_code, "success",)
    except sh.ErrorReturnCode as shex:
        # TODO log some stuff here
        # TODO maybe return exception message instead of exit code, 
        # or a tuple of both?
        LOGGER.info("shell exception is %s", shex)
        # but it does!
        return (shex.exit_code, str(shex)) # pylint: disable=no-member
    except:
        exc = sys.exc_info()[0]
        LOGGER.info("General exception is %s", exc)
        # TODO log some stuff here
        # TODO maybe return exception message instead of exit code, 
        # or a tuple of both?
        return (-666, str(exc))

@APP.task(bind=True)
def run_seacr(
    self,
    job_dir,
    seacr_command,
    file1,
    file2,
    threshold,
    normnon,
    unionauc,
    output_prefix,
):
    "run seacr"
    # TODO change to unique temp dir based on task id
    LOGGER.info("task id is %s", self.request.id)
    # 'with os.chdir(...)' is not working for some reason, so just omit the `with`.
    os.chdir(job_dir)
    args = [file1]
    if threshold:
        args.append(threshold)
    else:
        args.append(file2)
    args.append(normnon)
    args.append(unionauc)
    args.append(output_prefix)
    # LC_ALL needs to be set to C on mac (only, I think) or `tr` will
    # complain of `illegal byte sequence` (https://unix.stackexchange.com/a/141423/64811)
    env = {}
    if os.uname()[0] == "Darwin":
        env["LC_ALL"] = "C"
    kwargs = dict(_err=err, _out=out, _env=env, seacr_command=seacr_command)
    # seacr = sh.Command(seacr_command)
    pool = ThreadPool(processes=1)
    async_result = pool.apply_async(seacr_wrapper, args, kwargs)
    errlen = 0
    outlen = 0
    while not async_result.ready():
        errs = err.getvalue()
        outs = out.getvalue()
        if len(errs) > errlen:
            enow = datetime.datetime.now()
            newerr = errs[errlen : len(errs)]
            print(newerr)
            errlen = len(errs)
            self.update_state(
                state="PROGRESS", meta={"STDERR": newerr, "timestamp": enow}
            )
        if len(outs) > outlen:
            onow = datetime.datetime.now()
            newout = outs[outlen : len(outs)]
            print(newout)
            outlen = len(outs)
            self.update_state(
                state="PROGRESS", meta={"STDOUT": newout, "timestamp": onow}
            )

        time.sleep(0.2)
    print("done")
    retval = async_result.get()
    # print("return value is {}".format(retval))
    LOGGER.info("return value is %s", retval)

    return retval


if __name__ == "__main__":
    run_seacr(
        None,  # this won't work... TODO create mock object?
        "/tmp",
        "./SEACR/SEACR_1.0.sh",
        "NPATBH.spike_Ec.bedgraph",
        "IgGBH.spike_Ec.bedgraph",
        None,
        "norm",
        "AUC",
        "SH_Hs_NPATBH.spike_Ec_IgGBH.spike_Ec",
    )
