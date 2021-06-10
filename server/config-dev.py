# Application

ADMIN_CONTACT = '<a href="mailto:hi@jeremi.as">hi@jeremi.as</a>'
APPLICATION_NAME = "Dionysos"
APPLICATION_ROOT = "/"
DEBUG = True
ENV = "development"
SERVER_NAME = "dionysos.jeremi.as"
TESTING = True
WEBSOCKET_PATH = "/socket"


# Cookies

COOKIE_PATH = "/"
COOKIE_SAMESITE = "Lax"

SESSION_COOKIE_PATH = COOKIE_PATH
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = True


# Security and secrets

CSRF_COOKIE_NAME = "csrf_token"
CSRF_HEADER = "X-CSRF-Token"
CSRF_DATA_KEY = "csrf"

HMAC_DIGEST = "sha3_256"
JWT_ALGORITHM = "HS512"
JWT_COOKIE_NAME = "jwt"
PREFERRED_URL_SCHEME = "https"

SECRET_KEY = b"CHANGE THIS"
GAME_PASSWORD_PEPPER = b"AND CHANGE THIS"
USER_PASSWORD_PEPPER = b"CHANGE THIS TOO"


# Internationalization

LANGUAGES = [
    "en",
]
DEFAULT_LANGUAGE = "en"
LANGUAGE_COOKIE_NAME = "lang"


# Files

LOG_FILE = "/var/log/dionysos/dionysos.log"


# Databases

POSTGRES_PARAMS = "dbname=dionysos"
REDIS_URL = "unix:///run/redis/redis.sock?db=0"


# Input length limits

GAME_NAME_LENGTH = {"min": 1, "max": 32}
PASSWORD_LENGTH = {"min": 6, "max": 250}
USERNAME_LENGTH = {"min": 1, "max": 25}


# Static paths

CARD_BASES_PATH = "/img/card-bases/"
CARD_IMAGES_PATH = "/img/cards/"
CARD_IMAGE_EXTENSION = "webp"


# Game

GAME_ID_LENGTH = 5
IDLE_TIMEOUT = 10
MAX_ACTIVE_GAMES_PER_USER = 2
MAX_PLAYERS_LIMITS = {"min": 1, "max": 10}
MAX_PLAYERS_DEFAULT = MAX_PLAYERS_LIMITS["max"]
MIN_PLAYERS_TO_START = 1
