#!/usr/bin/env python3

"""
Application.
"""


import datetime
import json
import logging
import os
import shutil


from flask import Flask, redirect, render_template, request, send_file, url_for, Response
from flask_bootstrap import Bootstrap

import pika

import simplejson

from werkzeug import secure_filename  # pylint: disable=no-name-in-module

from lib.upload_file import uploadfile

from tasks import run_seacr

import util


def create_app():
    "APP creation"
    app = Flask(__name__)
    Bootstrap(app)
    return app


APP = create_app()

logging.basicConfig(level=logging.INFO)

# FIXME/TODO move secret_key into env var
APP.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "i guess it's not set!")
APP.config["UPLOAD_FOLDER"] = "data/"
APP.config["THUMBNAIL_FOLDER"] = "data/thumbnail/"
APP.config["JOB_DIR"] = "jobs/"
# APP.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024

ALLOWED_EXTENSIONS = set(
    # TODO remove everything but "bed" and "bedgraph" from this set:
    [
        "bed",
        "bedgraph",
        "txt",
        "gif",
        "png",
        "jpg",
        "jpeg",
        "bmp",
        "rar",
        "zip",
        "7zip",
        "doc",
        "docx",
    ]
)
IGNORED_FILES = set([".gitignore"])

# bootstrap = Bootstrap(APP)


def allowed_file(filename):
    "is file allowed to be uploaded?"
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def gen_file_name(filename):
    """
    If file was exist already, rename it and return a new name
    """

    i = 1
    while os.path.exists(os.path.join(APP.config["UPLOAD_FOLDER"], filename)):
        name, extension = os.path.splitext(filename)
        filename = "%s_%s%s" % (name, str(i), extension)
        i += 1

    return filename

@APP.route("/test", methods=['GET'])
def testroute():
    "test route"
    resp = Response(json.dumps({"status": "ok"}))
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp

@APP.route("/get_job_status", methods=["GET"])
def get_job_status():
    "get job status"
    if not request.args:
        return json.dumps({"error": "no args"})
    if not "job_id" in request.args:
        return json.dumps({"error": "missing 'job_id' arg"})
    job_id = request.args["job_id"]
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(host=util.get_rabbit_host())
    )  # TODO unhardcode host name (use env var)
    channel = connection.channel()
    # TODO handle exception here if queue does not exist:
    method_frame, header_frame, body = channel.basic_get(job_id)
    log_msg = None
    log_obj = None
    if method_frame:
        print(method_frame, header_frame, body)
        log_msg = body.decode("utf-8")
        log_obj = json.loads(log_msg)

        channel.basic_ack(method_frame.delivery_tag)
    else:
        print("No message returned")
    # check pika queue for any log messages
    # then check stask status
    # put them together & return them

    res = run_seacr.AsyncResult(task_id=job_id)
    #    print(f'State={result.state}, info={result.info}')

    retval = {"state": res.state, "info": res.info, "log_obj": log_obj}
    print("returning:")
    print(retval)
    return json.dumps(retval)


@APP.route("/kick_off_job", methods=["POST"])
def kick_off_job():
    "kick off a seacr job"
    print("in kick_off_job()")
    jsons = request.get_json()
    if jsons is None:
        return '{"result": "none"}'

    print("in kick_off_job(), jsons is")
    print(jsons)
    print(jsons.__class__)

    # create a job directory:
    job_dir = "{}{}".format(util.get_job_directory(), jsons["timestamp"])
    job_dir = os.path.abspath(job_dir)
    os.mkdir(job_dir)

    print("current directory is {}".format(os.getcwd()))
    logging.info("current directory is %s", os.getcwd())
    # move file(s) to jobs directory:
    shutil.move(
        "{}{}".format(APP.config["UPLOAD_FOLDER"], jsons["file1"]),
        "{}/{}".format(job_dir, jsons["file1"]),
    )

    if jsons["file2"] is not None and jsons["file2"] != "":
        shutil.move(
            "{}{}".format(APP.config["UPLOAD_FOLDER"], jsons["file2"]),
            "{}/{}".format(job_dir, jsons["file2"]),
        )

    # NOTE: hardcoding SEACR version here
    seacr_path = os.path.dirname(os.path.abspath(__file__)) + "/SEACR/" + "SEACR_1.0.sh"

    while True:
        try:
            print("trying run_seacr.....")
            task = run_seacr.delay(
                job_dir,
                seacr_path,
                jsons["file1"],
                jsons["file2"],
                jsons["threshold"],
                jsons["normnon"],
                jsons["unionauc"],
                jsons["output_prefix"],
            )
            break
        except:  # pylint: disable=bare-except
            pass
    # if True:
    #     return json.dumps('{"status": "ok"}')
    print("task id is")
    print(task.task_id)
    return json.dumps(dict(taskId=task.task_id))


@APP.route("/upload", methods=["GET", "POST"])
def upload():
    "file upload route"
    if request.method == "POST":
        key = list(request.files.keys())[0]  # TODO ensure keys() is not empty
        files = request.files[key]

        if files:
            filename = secure_filename(files.filename)
            filename = gen_file_name(filename)
            mime_type = files.content_type

            if not allowed_file(files.filename):
                result = uploadfile(
                    name=filename,
                    type=mime_type,
                    size=0,
                    not_allowed_msg="File type not allowed",
                )

            else:
                # save file to disk
                uploaded_file_path = os.path.join(APP.config["UPLOAD_FOLDER"], filename)
                files.save(uploaded_file_path)

                # create thumbnail after saving
                # if mime_type.startswith('image'):
                #     create_thumbnail(filename)

                # get file size after saving
                size = os.path.getsize(uploaded_file_path)

                # return json for js call back
                result = uploadfile(name=filename, type=mime_type, size=size)

            return simplejson.dumps({"files": [result.get_file()]})

    # TODO get rid of this:
    if request.method == "GET":
        # get all file in ./data directory
        files = [
            f
            for f in os.listdir(APP.config["UPLOAD_FOLDER"])
            if os.path.isfile(os.path.join(APP.config["UPLOAD_FOLDER"], f))
            and f not in IGNORED_FILES
        ]

        file_display = []

        for file in files:
            size = os.path.getsize(os.path.join(APP.config["UPLOAD_FOLDER"], file))
            file_saved = uploadfile(name=file, size=size)
            file_display.append(file_saved.get_file())

        return simplejson.dumps({"files": file_display})

    return redirect(url_for("i"))


@APP.route("/")
def main_route():
    "default route"
    timestamp = datetime.datetime.now().isoformat()
    return render_template("index.html", timestamp=timestamp)


@APP.route("/submit", methods=["POST"])
def submit():
    "submit job"
    print("files are {}".format(request.files))
    return "OK"


@APP.route("/send_file/<job_dir>/<prefix>/<path:filenum>", methods=["GET"])
def send_file_to_user(filenum, prefix, job_dir):
    "send file to user"
    try:
        int(job_dir)
        int(filenum)
    except ValueError:
        return simplejson.dumps({"error": "invalid values"})
    for char in ["/", ".", "\\"]:
        if char in prefix:
            return simplejson.dumps({"error": "invalid values"})
    full_job_dir = util.get_job_directory() + job_dir
    result_files = [x for x in os.listdir(full_job_dir) if x.startswith(prefix)]
    result_file = os.path.join(full_job_dir, result_files[int(filenum)])
    return send_file(result_file, as_attachment=True)


if __name__ == "__main__":
    APP.run(debug=True)  # debug will be false in production (gunicorn)
