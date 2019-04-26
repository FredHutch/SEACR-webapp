from celery import Celery
import sh

import io
import threading
import time

# app = Celery("tasks", backend="rpc://", broker="pyamqp://guest@localhost//")

app = Celery("tasks", backend="rpc://", broker="pyamqp://guest@fieldroast//")


@app.task
def add(x, y):
    return x + y


# @app.task(bind=True)
def run_seacr(file1, file2, threshold, normnon, unionauc, output_prefix):
    "run seacr"
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
    # LC_ALL needs to be set to C on mac or `tr` will
    # complain of `illegal byte sequence` (https://unix.stackexchange.com/a/141423/64811)
    # TODO, only add this if we are on a mac
    kwargs = dict(_err=err, _out=out, _env=dict(LC_ALL="C"))
    seacr = sh.Command("SEACR/SEACR_1.0.sh")
    t = threading.Thread(target=seacr, args=args, kwargs=kwargs)
    # TODO get the return value, the below won't work
    # maybe try https://stackoverflow.com/a/14299004/470769
    return_value = t.start()
    while t.is_alive():
        # TODO only show new output each time through the loop
        # TODO send a custom task status here
        print("OUT: {}".format(out.getvalue()))
        print("ERR: {}".format(err.getvalue()))
        time.sleep(0.2)
    print("done")
    print("return value is {}".format(return_value))


if __name__ == "__main__":
    run_seacr(
        "NPATBH.spike_Ec.bedgraph",
        "IgGBH.spike_Ec.bedgraph",
        None,
        "norm",
        "AUC",
        "SH_Hs_NPATBH.spike_Ec_IgGBH.spike_Ec",
    )
