from functools import wraps
import uuid

from flask import g, request
from flask_socketio import leave_room
from passlib.hash import bcrypt
import jwt

from . import app, db, redis_db, socketio
from .errors import DatabaseError
from .game import Game
from .utils import fail


def _check_origin():
    if 'Origin' in request.headers:
        if request.headers['Origin'] != f'{request.scheme}://{request.host}':
            return False
    return True


def _get_user_id_from_jwt():
    decoded_token = jwt.decode(request.cookies[app.config['JWT_COOKIE']],
        app.config['SECRET_KEY'], algorithms=[app.config['JWT_ALGORITHM']])
    if 'userID' not in decoded_token or not isinstance(decoded_token['userID'], int):
        return None
    return decoded_token['userID']


def check_csrf_data(func):
    @wraps(func)
    def check_csrf(*args, **kwargs):
        if not _check_origin():
            return fail('origin-check-failed')

        if (len(args) == 0
                or not isinstance(args[0], dict)
                or app.config['CSRF_DATA_KEY'] not in args[0]
                or app.config['CSRF_COOKIE'] not in request.cookies):
            return fail('missing-csrf-token')
        if request.cookies[app.config['CSRF_COOKIE']] != args[0][app.config['CSRF_DATA_KEY']]:
            return fail('csrf-token-mismatch')
        return func(*args, **kwargs)
    return check_csrf


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
        

def login_required(func):
    @wraps(func)
    def check_jwt(*args, **kwargs):
        invalid_jwt = fail('invalid-jwt', 401)
        if app.config['JWT_COOKIE'] not in request.cookies:
            return fail('no-jwt-cookie', 401)
        try:
            user_id = _get_user_id_from_jwt()
        except jwt.PyJWTError as e:
            return fail('invalid-jwt', 401)
        if user_id is None:
            return fail('invalid-jwt-payload', 401)
        try:
            user = User(user_id)
        except DatabaseError:
            return fail('no-such-user', 401)
        g.user = user
        return func(*args, **kwargs)
    return check_jwt


def set_jwt_cookie(response, user):
    response.set_cookie(
        app.config['JWT_COOKIE'],
        jwt.encode(
            {'userID': user.id},
            app.config['SECRET_KEY'],
            algorithm=app.config['JWT_ALGORITHM']),
        max_age=10 * 365 * 24 * 60 * 60,
        secure=True,
        httponly=True,
        samesite='Lax')


def set_csrf_cookie(response):
    response.set_cookie(
        app.config['CSRF_COOKIE'],
        str(uuid.uuid4()),
        max_age=10 * 365 * 24 * 60 * 60,
        secure=True,
        samesite='Lax')


def unset_jwt_cookie(response):
    response.set_cookie(
        app.config['JWT_COOKIE'],
        value='',
        max_age=0,
        secure=True,
        httponly=True,
        samesite='Lax')


class User():
    def __init__(self, user_id):
        self.id = int(user_id)
        cur = db.cursor()
        cur.execute('SELECT name, password_hash FROM users WHERE id = %s;', [self.id])
        if cur.rowcount == 0:
            cur.close()
            raise DatabaseError('invalid-user-id')
        elif cur.rowcount > 1:
            # TODO: log this
            cur.close()
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
            'RETURNING game_id;', [self.id])
        if cur.rowcount > 1:
            pass # TODO: log this
        for game_id, in cur:
            game = Game(game_id)
            leave_room(game.room)
            game.remove_player(self)
        cur.close()

    def verify_password(self, password):
        return bcrypt.verify(password, self.password_hash)
