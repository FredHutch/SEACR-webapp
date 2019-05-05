#!/usr/bin/env python3

"""
Application.
"""

import datetime

from flask import Flask, render_template, request
from flask_bootstrap import Bootstrap

# ----

import os

# import PIL
# from PIL import Image
import simplejson
import traceback

from flask import (
    Flask,
    request,
    render_template,
    redirect,
    url_for,
    send_from_directory,
)
from flask_bootstrap import Bootstrap
from werkzeug import secure_filename  # pylint: disable=no-name-in-module

from lib.upload_file import uploadfile


def create_APP():
    "APP creation"
    APP = Flask(__name__)
    Bootstrap(APP)
    return APP


APP = create_APP()

# FIXME/TODO move secret_key into env var
APP.config["SECRET_KEY"] = "hard to guess string"
APP.config["UPLOAD_FOLDER"] = "data/"
APP.config["THUMBNAIL_FOLDER"] = "data/thumbnail/"
APP.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024

ALLOWED_EXTENSIONS = set(
    ["txt", "gif", "png", "jpg", "jpeg", "bmp", "rar", "zip", "7zip", "doc", "docx"]
)
IGNORED_FILES = set([".gitignore"])

# bootstrap = Bootstrap(APP)


def allowed_file(filename):
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


@APP.route("/upload", methods=["GET", "POST"])
def upload():
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

    if request.method == "GET":
        # get all file in ./data directory
        files = [
            f
            for f in os.listdir(APP.config["UPLOAD_FOLDER"])
            if os.path.isfile(os.path.join(APP.config["UPLOAD_FOLDER"], f))
            and f not in IGNORED_FILES
        ]

        file_display = []

        for f in files:
            size = os.path.getsize(os.path.join(APP.config["UPLOAD_FOLDER"], f))
            file_saved = uploadfile(name=f, size=size)
            file_display.append(file_saved.get_file())

        return simplejson.dumps({"files": file_display})

    return redirect(url_for("i"))


@APP.route("/")
def main_route():
    "default route"
    timestamp = datetime.datetime.now().isoformat()
    return render_template("index.html", timestamp=timestamp)


@APP.route("/i")
def main_route2():
    "default route2"
    timestamp = datetime.datetime.now().isoformat()
    return render_template("i.html", timestamp=timestamp)


@APP.route("/submit", methods=["POST"])
def submit():
    "submit job"
    print("files are {}".format(request.files))
    return "OK"


if __name__ == "__main__":
    APP.run(debug=True)  # debug will be false in production (gunicorn)
