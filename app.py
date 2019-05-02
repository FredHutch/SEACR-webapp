#!/usr/bin/env python3

"""
Application.
"""

import datetime

from flask import Flask, render_template, request
from flask_bootstrap import Bootstrap


def create_app():
    "app creation"
    app = Flask(__name__)
    Bootstrap(app)
    return app


APP = create_app()


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


if __name__ == "__main__":
    APP.run(debug=True)  # debug will be false in production (gunicorn)
