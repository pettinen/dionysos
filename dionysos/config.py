ADMIN_EMAIL = 'hi@jeremi.as'
APPLICATION_NAME = 'Dionysos'
APPLICATION_ROOT = '/'
CSRF_COOKIE = 'csrf_token'
CSRF_HEADER = 'X-CSRF-Token'
CSRF_DATA_KEY = 'csrf'
JWT_ALGORITHM = 'HS512'
JWT_COOKIE = 'jwt'
PREFERRED_URL_SCHEME = 'https'
PSYCOPG2_DB = 'dbname=dionysos'
REDIS_URL = 'unix:///run/redis/redis.sock?db=0'
SECRET_KEY = b'CHANGE THIS'
SERVER_NAME = 'dionysos.jeremi.as'
SESSION_COOKIE_SECURE = True
SQLALCHEMY_DATABASE_URI = 'postgresql+psycopg2:///dionysos'
SQLALCHEMY_ECHO = True
SQLALCHEMY_TRACK_MODIFICATIONS = False
TESTING = True

CARDS_URL = 'img/cards/'
CARD_IMG_EXT = 'webp'
CARD_BASES_URL = 'img/card-bases/'
MAX_PLAYERS_MIN = 1
MAX_PLAYERS_MAX = 10
MAX_PLAYERS_DEFAULT = MAX_PLAYERS_MAX

ACTION_CARD_ID = 'act'
ALL_CARD_ID = 'all'
PERMANENT_CARD_ID  = 'perm'
USE_CARD_ID = 'use'
