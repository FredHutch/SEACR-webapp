#!/usr/bin/env python3

"""
Application.
"""

import datetime

from flask import Flask, render_template
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
    return render_template("index.html")


@APP.route("/test")
def test_route():
    "test route"
    return render_template("test.html")


@APP.route("/derj")
def bzz_route():
    "bzz route"
    timestamp = datetime.datetime.now().isoformat()
    return render_template("bzz.html", timestamp=timestamp)


if __name__ == "__main__":
    APP.run(debug=True)  # debug will be false in production (gunicorn)
