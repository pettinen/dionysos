ADMIN_CONTACT = '<a href="mailto:hi@jeremi.as">hi@jeremi.as</a>'
APPLICATION_NAME = 'Dionysos'
APPLICATION_ROOT = '/'
COOKIE_PATH = '/'
CSRF_COOKIE = 'csrf_token'
CSRF_HEADER = 'X-CSRF-Token'
CSRF_DATA_KEY = 'csrf'
HMAC_DIGEST = 'sha3_256'
JWT_ALGORITHM = 'HS512'
JWT_COOKIE = 'jwt'
LANGUAGES = ['en']
DEFAULT_LANGUAGE = 'en'
LANGUAGE_COOKIE = 'lang'
LOG_FILE = 'dionysos.log'
PEPPER_GAME_PW = b'CHANGE THIS'
PEPPER_USER_PW = b'CHANGE THIS TOO'
PREFERRED_URL_SCHEME = 'https'
PSYCOPG2_DB = 'dbname=dionysos'
REDIS_URL = 'unix:///run/redis/redis.sock?db=0'
SECRET_KEY = b'CHANGE THIS'
SERVER_NAME = 'dionysos.jeremi.as'
SESSION_COOKIE_SECURE = True
TESTING = True

GAME_ID_LENGTH = 5
PASSWORD_MIN_LENGTH = 6
USERNAME_MAX_LENGTH = 25
GAME_NAME_MAX_LENGTH = 32

CARDS_URL = 'img/cards/'
CARD_IMG_EXT = 'webp'
CARD_BASES_URL = 'img/card-bases/'
IDLE_TIMEOUT = 10
MAX_GAMES_PER_USER = 2
MAX_PLAYERS_MIN = 1
MAX_PLAYERS_MAX = 10
MAX_PLAYERS_DEFAULT = MAX_PLAYERS_MAX
MIN_PLAYERS_TO_START = 1
