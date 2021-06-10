import logging
import sys

import psycopg2
import toml
from argon2 import PasswordHasher
from flask import Flask, g, session
from flask_redis import FlaskRedis
from flask_socketio import SocketIO


app = Flask(__name__, static_url_path="/")
app.config.from_pyfile(sys.argv[1])

log_file = app.config["LOG_FILE"]
if log_file and app.debug:
    logging.basicConfig(filename=log_file, filemode="w", level=logging.DEBUG)
elif log_file:
    logging.basicConfig(filename=log_file, level=logging.WARNING)

socketio = SocketIO(app, path=app.config["WEBSOCKET_PATH"], cookie=None)

db = psycopg2.connect(app.config["POSTGRES_PARAMS"])
db.autocommit = True

redis = FlaskRedis(app, decode_responses=True)

from . import handlers, views
