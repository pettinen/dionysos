import logging

from flask import Flask, g, session
from flask_redis import FlaskRedis
from flask_socketio import SocketIO
import psycopg2


app = Flask(__name__, static_url_path='/')
app.config.from_object('server.config')

log = app.config.get('LOG_FILE')
if app.config['TESTING']:
    logging.basicConfig(filename=log, filemode='w', level=logging.DEBUG)
elif log:
    logging.basicConfig(filename=log, level=logging.WARNING)

socketio = SocketIO(app, path='/socket', cookie=None)

db = psycopg2.connect(app.config['PSYCOPG2_DB'])
db.autocommit = True

redis_db = FlaskRedis(app, decode_responses=True)

from . import auth, handlers, views
