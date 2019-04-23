#!/usr/bin/env python3

"""
Application.
"""

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


if __name__ == "__main__":
    APP.run(debug=True)  # debug will be false in production (gunicorn)
