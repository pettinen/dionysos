from functools import wraps
import logging
import uuid

from flask import g, request
from flask_socketio import leave_room
from passlib.hash import bcrypt
import jwt

from . import app, db, redis_db, socketio
from .errors import DatabaseError
from .game import Game
from .utils import fail, set_cookie


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
                # log(log_msg_start + "without a JWT cookie")
                return failure
            try:
                user_id = _get_user_id_from_jwt()
            except jwt.PyJWTError as e:
                # log(log_msg_start + "with an invalid JWT")
              clear_jwt_cookie = True
              return failure
            if user_id is None:
                # log(log_msg_start + "with a JWT not containing a user ID")
                clear_jwt_cookie = True
                return failure
            try:
                user = User(user_id)
            except DatabaseError:
                # log(log_msg_start + "with a JWT containing a nonexistent user ID")
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


def set_jwt_cookie(response, user):
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


class User():
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
            if not bcrypt.verify(password.strip(), game.password_hash):
                raise ValueError('invalid-password')
        game.add_player(self)

    def leave_game(self):
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

    def verify_password(self, password):
        return bcrypt.verify(password, self.password_hash)
