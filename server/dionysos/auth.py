import hmac
import logging
import uuid
from enum import Enum
from functools import wraps

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from flask import g, request
from flask_socketio import leave_room

from . import app, db, redis_db, socketio
from .errors import DatabaseError
from .utils import fail, set_cookie


_password_hasher = PasswordHasher()


class PasswordType(Enum):
    """Enum with password-type-specific peppers as values."""

    GAME = app.config["PEPPER_GAME_PW"]
    USER = app.config["PEPPER_USER_PW"]


def _check_origin():
    if 'Origin' in request.headers:
        if request.headers['Origin'] != f'{request.scheme}://{app.config["SERVER_NAME"]}':
            return False
    return True


def _get_user_id_from_jwt():
    decoded_token = jwt.decode(request.cookies[app.config['JWT_COOKIE']],
        app.config['SECRET_KEY'], algorithms=[app.config['JWT_ALGORITHM']])
    if 'userID' not in decoded_token or not isinstance(decoded_token['userID'], int):
        return None
    return decoded_token['userID']


def check_csrf_data(arg):
    if not _check_origin():
        return fail('origin-check-failed')

    if (not isinstance(arg, dict)
            or app.config['CSRF_DATA_KEY'] not in arg
            or app.config['CSRF_COOKIE'] not in request.cookies):
        return fail('missing-csrf-token')
    if request.cookies[app.config['CSRF_COOKIE']] != arg[app.config['CSRF_DATA_KEY']]:
        return fail('csrf-token-mismatch')
    return True


def check_csrf_header(func):
    @wraps(func)
    def check_csrf(*args, **kwargs):
        if not _check_origin():
            return fail('origin-check-failed')

        if (app.config['CSRF_HEADER'] not in request.headers
                or app.config['CSRF_COOKIE'] not in request.cookies):
            return fail('missing-csrf-token')
        if request.cookies[app.config['CSRF_COOKIE']] != request.headers[app.config['CSRF_HEADER']]:
            return fail('csrf-token-mismatch')
        return func(*args, **kwargs)
    return check_csrf


def hash_password(password: str, type: PasswordType) -> str:
    digest_type = app.config["HMAC_DIGEST"]
    digest = hmac.digest(type.value, password.encode(), digest_type)
    return _password_hasher.hash(digest)


def login_optional(func):
    @wraps(func)
    def check_jwt(*args, **kwargs):
        g.user = None
        if app.config['JWT_COOKIE'] not in request.cookies:
            return func(*args, **kwargs)
        try:
            user_id = _get_user_id_from_jwt()
        except jwt.PyJWTError:
            return func(*args, **kwargs)
        if user_id is None:
            return func(*args, **kwargs)
        try:
            user = User(user_id)
        except DatabaseError:
            return func(*args, **kwargs)
        g.user = user
        return func(*args, **kwargs)
    return check_jwt


def login_required_factory(decorator_type):
    def decorator(func):
        @wraps(func)
        def check(*args, **kwargs):
            log_msg_start = "User attempted to do something requiring login "
            failure = fail('not-logged-in', 401)
            clear_jwt_cookie = False

            if app.config['JWT_COOKIE'] not in request.cookies:
                logging.info(log_msg_start + "without a JWT cookie")
                return failure
            try:
                user_id = _get_user_id_from_jwt()
            except jwt.PyJWTError as e:
                logging.info(log_msg_start + "with an invalid JWT")
                clear_jwt_cookie = True
                return failure
            if user_id is None:
                logging.info(log_msg_start + "with a JWT not containing a user ID")
                clear_jwt_cookie = True
                return failure
            try:
                user = User(user_id)
            except DatabaseError:
                logging.info(log_msg_start + "with a JWT containing a nonexistent user ID")
                clear_jwt_cookie = True
                return failure
            g.user = user
            response = func(*args, **kwargs)
            if clear_jwt_cookie and decorator_type == 'flask':
                unset_jwt_cookie()
            if decorator_type == 'socketio':
                if len(args) == 0:
                    args.append({})
                csrf_result = check_csrf_data(args[0])
                if csrf_result != True:
                    return csrf_result
            return response
        return check
    return decorator

# Decorator for standard Flask routes
login_required = login_required_factory('flask')
# Decorator for Socket.IO events
socket_login_required = login_required_factory('socketio')


def password_needs_rehash(hash: str) -> bool:
    return _password_hasher.check_needs_rehash(hash)


def set_jwt_cookie(response, user):
    if user is None:
        unset_jwt_cookie(response)
    else:
        set_cookie(
            response,
            app.config['JWT_COOKIE'],
            jwt.encode(
                {'userID': user.id},
                app.config['SECRET_KEY'],
                algorithm=app.config['JWT_ALGORITHM']),
            httponly=True)


def set_csrf_cookie(response):
    set_cookie(
        response,
        app.config['CSRF_COOKIE'],
        uuid.uuid4().hex)


def unset_jwt_cookie(response):
    set_cookie(response, app.config['JWT_COOKIE'], '', delete=True)


def verify_password(hash: str, password: str, type: PasswordType) -> bool:
    digest_type = app.config["HMAC_DIGEST"]
    digest = hmac.digest(type.value, password.encode(), digest_type)

    try:
        return _password_hasher.verify(hash, digest)
    except VerifyMismatchError:
        return False


class User:
    def __init__(self, user_id):
        self.id = int(user_id)
        cur = db.cursor()
        cur.execute('SELECT name, password_hash FROM users WHERE id = %s;', [self.id])
        if cur.rowcount == 0:
            cur.close()
            raise DatabaseError('invalid-user-id')
        elif cur.rowcount > 1:
            cur.close()
            logging.critical(f"Multiple users have the same ID {user_id}")
            raise DatabaseError('multiple-users-same-id')
        self.name, self.password_hash = cur.fetchone()
        cur.close()

    @property
    def current_game(self):
        from .game import Game

        cur = db.cursor()
        cur.execute('SELECT game_id FROM users_games WHERE user_id = %s;', [self.id])
        if cur.rowcount > 1:
            pass # TODO: log this
        game_id = cur.fetchone()
        cur.close()
        if game_id is None:
            return None
        return Game(game_id[0])

    def emit(self, *args):
        sid = redis_db.hget('user-sids', self.id)
        if sid is None:
            return # TODO: log this
        socketio.emit(*args, room=sid)

    def join_game(self, game, password=None):
        if game.password_protected:
            if password is None:
                raise ValueError('password-required')
            if not verify_password(game.password_hash, password.strip(), PasswordType.GAME):
                raise ValueError('invalid-password')
        game.add_player(self)

    def leave_game(self):
        from .game import Game

        cur = db.cursor()
        cur.execute(
            'DELETE FROM users_games WHERE user_id = %s'
            ' RETURNING game_id;', [self.id])
        if cur.rowcount > 1:
            pass # TODO: log this
        for game_id, in cur:
            game = Game(game_id)
            leave_room(game.room)
            game.remove_player(self)
        cur.close()

    @property
    def public_info(self):
        return {
            'id': self.id,
            'name': self.name
        }

    def update_password(self, new_password: str) -> None:
        new_hash = hash_password(new_password, PasswordType.USER)
        cur = db.cursor()
        cur.execute("UPDATE users SET password_hash = %s WHERE id = %s;", [new_hash, self.id])
        cur.close()

    def verify_password(self, password):
        return verify_password(self.password_hash, password, PasswordType.USER)
