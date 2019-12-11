from flask import Flask, g, session
from flask_redis import FlaskRedis
from flask_socketio import SocketIO
import psycopg2


app = Flask(__name__, static_url_path='/')
app.config.from_object('dionysos.config')

socketio = SocketIO(app, path='/socket', cookieHttpOnly=True)

db = psycopg2.connect(app.config['PSYCOPG2_DB'])
db.autocommit = True

redis_db = FlaskRedis(app, decode_responses=True)

from . import auth, handlers, views
