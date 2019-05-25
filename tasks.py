"""
Celery tasks
"""

import datetime
import io
import json
from multiprocessing.pool import ThreadPool
import os
import sys

# import threading
import time


from celery import Celery
from celery.utils.log import get_task_logger
import pika
import sh

LOGGER = get_task_logger(__name__)

APP = Celery("tasks", backend="rpc://", broker="pyamqp://guest@localhost//")

# APP = Celery("tasks", backend="rpc://", broker="pyamqp://guest@fieldroast//")

ERR = io.StringIO()
OUT = io.StringIO()


def datetime_to_number(dtm):
    "convert a datetime to a number"
    return (dtm - datetime.datetime(1970, 1, 1)).total_seconds()


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
        seacr = sh.Command(kwargs["seacr_command"])
        del kwargs["seacr_command"]
        result = seacr(*args, **kwargs)
        LOGGER.info("success!")
        time.sleep(2)
        return (result.exit_code, "success")
    except sh.ErrorReturnCode as shex:
        # TODO log some stuff here
        # TODO maybe return exception message instead of exit code,
        # or a tuple of both?
        LOGGER.info("shell exception is %s", shex)
        # but it does!
        time.sleep(2)
        return (shex.exit_code, str(shex))  # pylint: disable=no-member
    except:  # pylint: disable=bare-except
        exc = sys.exc_info()[0]
        LOGGER.info("General exception is %s", exc)
        # TODO log some stuff here
        # TODO maybe return exception message instead of exit code,
        # or a tuple of both?
        time.sleep(2)
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
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(host="localhost")
    )  # TODO unhardcode hostname (use env var)
    channel = connection.channel()
    channel.queue_declare(queue=self.request.id)
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
    kwargs = dict(_err=ERR, _out=OUT, _env=env, seacr_command=seacr_command)
    # seacr = sh.Command(seacr_command)
    pool = ThreadPool(processes=1)
    async_result = pool.apply_async(seacr_wrapper, args, kwargs)
    errlen = 0
    outlen = 0
    errcount = 0
    outcount = 0
    while not async_result.ready():
        errs = ERR.getvalue()
        outs = OUT.getvalue()
        if len(errs) > errlen:
            enow = datetime.datetime.utcnow().isoformat()
            newerr = errs[errlen : len(errs)]
            LOGGER.info("new STDERR output is %s", newerr)

            print(newerr)
            errlen = len(errs)
            # self.update_state(
            #     state="PROGRESS", meta={"STDERR": newerr, "timestamp": enow, "count": errcount}
            # )
            channel.basic_publish(
                exchange="",
                routing_key=self.request.id,
                body=json.dumps(
                    dict(
                        stream="STDERR",
                        data=newerr,
                        timestamp=enow,
                        count=errcount,
                    )
                ),
            )
            errcount += 1

        if len(outs) > outlen:
            onow = datetime.datetime.utcnow().isoformat()
            newout = outs[outlen : len(outs)]
            LOGGER.info("new STDOUT output is %s", newout)
            print(newout)
            outlen = len(outs)
            channel.basic_publish(
                exchange="",
                routing_key=self.request.id,
                body=json.dumps(
                    dict(
                        stream="STDOUT",
                        data=newout,
                        timestamp=onow,
                        count=outcount,
                    )
                ),
            )
            outcount += 1

        time.sleep(0.05)
    print("done")
    retval = async_result.get()
    LOGGER.info("return value is %s", retval)
    if retval[0] == 0:
        result_files = [x for x in os.listdir(".") if x.startswith(output_prefix)]
        retval = (retval, result_files)
    connection.close()
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
