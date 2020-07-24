from flask import g, request

from . import redis_db, socketio
from .auth import login_optional, socket_login_required
from .errors import DatabaseError, GameError
from .game import Card, Game
from .utils import only_arg_dict, fail


@socketio.on('connect')
@login_optional
def connect():
    if g.user is not None:
        redis_db.hset('user-sids', g.user.id, request.sid)


@socketio.on('disconnect')
@login_optional
def disconnect():
    if g.user is not None:
        redis_db.hdel('user-sids', g.user.id)
        g.user.leave_game()


@socketio.on('create-game')
@socket_login_required
def create_game(*args):
    if not only_arg_dict(args):
        return fail('invalid-arguments')

    if g.user.current_game is not None:
        return g.user.leave_game()

    data, = args
    if ('name' not in data
            or not isinstance(data['name'], str)):
        return fail('invalid-game-name')

    if ('maxPlayers' not in data
            or not isinstance(data['maxPlayers'], int)):
        return fail('invalid-max-players')

    if 'password' in data and not isinstance(data['password'], str):
        return fail('invalid-password')

    if 'remote' not in data or not isinstance(data['remote'], bool):
        return fail('invalid-remote')

    # TODO: check against MAX_GAMES_PER_USER
    try:
        game = Game.create(data['name'], data['maxPlayers'],
            data['remote'], password=data.get('password'))
    except (DatabaseError, ValueError) as e:
        return fail(e)

    return {'success': True, 'id': game.id}


@socketio.on('join-game')
@socket_login_required
def join_game(*args):
    if not only_arg_dict(args):
        return fail('invalid-arguments')

    # If the user is not in a game, this does nothing.
    # Called in case disconnection is not registered and the user still appears in-game.
    g.user.leave_game()

    data, = args
    if 'id' not in data or not isinstance(data['id'], str):
        return fail('invalid-game-id')

    try:
        game = Game(data['id'])
    except ValueError as e:
        return fail(e)

    if 'password' in data and not isinstance(data['password'], str):
        return fail('invalid-password')

    try:
        g.user.join_game(game, data.get('password'))
    except (DatabaseError, GameError, ValueError) as e:
        return fail(e)

    return {'success': True, 'players': game.players}


@socketio.on('start-game')
@socket_login_required
def start_game(*args):
    if not only_arg_dict(args):
        return fail('invalid-arguments')

    data, = args
    if 'id' not in data or not isinstance(data['id'], str):
        return fail('invalid-game-id')
    if g.user.current_game is None or data['id'] != g.user.current_game.id:
        return fail('not-in-game')

    try:
        game = Game(data['id'])
    except ValueError as e:
        return fail(e)

    if g.user.id != game.creator.id:
        return fail('not-creator')

    try:
        game.start()
    except (DatabaseError, GameError) as e:
        return fail(e)
    return {'success': True}


@socketio.on('leave-game')
@socket_login_required
def leave_game(*args):
    if not only_arg_dict(args):
        return fail('invalid-arguments')

    data, = args
    if 'id' not in data or not isinstance(data['id'], str):
        return fail('invalid-game-id')

    g.user.leave_game()
    return {'success': True}


@socketio.on('draw-card')
@socket_login_required
def draw_card(*args):
    if len(args) != 1:
        return fail('invalid-arguments')

    game = g.user.current_game
    if game is None:
        return fail('not-in-game')
    if game.ended:
        return fail('game-ended')
    if g.user.id != game.current_player:
        return fail('not-in-turn')

    try:
        card = game.draw_card()
    except GameError as e:
        return fail(e)
    return {'success': True, 'id': card.id}


@socketio.on('use-card')
@socket_login_required
def use_card(*args):
    if not only_arg_dict(args):
        return fail('invalid-arguments')

    data, = args
    if 'id' not in data or not isinstance(data['id'], int):
        return fail('invalid-card-id')

    card = Card(data['id'])
    game = g.user.current_game
    if game is None:
        return fail('not-in-game')
    try:
        game.use_card(card, g.user)
    except GameError as e:
        return fail(e)

    return {'success': True}
