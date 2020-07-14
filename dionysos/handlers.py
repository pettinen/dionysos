from flask import g, request

from . import redis_db, socketio
from .auth import check_csrf_data, login_optional, login_required
from .errors import DatabaseError, GameError
from .game import Card, Game
from .utils import fail


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
@login_required
@check_csrf_data
def create_game(*args):
    if len(args) != 1 or not isinstance(args[0], dict):
        return fail('invalid-arguments')
    if g.user.current_game is not None:
        return fail('already-in-game')

    data, = args
    if ('name' not in data
            or not isinstance(data['name'], str)):
        return fail('invalid-game-name')

    if ('maxPlayers' not in data
            or not isinstance(data['maxPlayers'], int)):
        return fail('invalid-max-players')

    if 'password' in data and not isinstance(data['password'], str):
        return fail('invalid-game-password')

    try:
        game = Game.create(data['name'], data['maxPlayers'], data.get('password'))
    except (DatabaseError, ValueError) as e:
        return fail(e)

    return {'success': True, 'id': game.id}


@socketio.on('join-game')
@login_required
@check_csrf_data
def join_game(*args):
    if len(args) != 1 or not isinstance(args[0], dict):
        return fail('invalid-arguments')
    if g.user.current_game is not None:
        return fail('already-in-game')

    data, = args
    if 'id' not in data or not isinstance(data['id'], int):
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
@login_required
@check_csrf_data
def start_game(*args):
    if len(args) != 1:
        return fail('invalid-arguments')

    game = g.user.current_game
    if game is None:
        return fail('not-in-game')
    if g.user.id != game.creator.id:
        return('not-creator')

    try:
        game.start()
    except (DatabaseError, GameError) as e:
        return fail(e)
    return {'success': True}


@socketio.on('end-game')
@login_required
@check_csrf_data
def end_game(*args):
    if len(args) != 1:
        return fail('invalid-arguments')
    if g.user.current_game is None:
        return fail('not-in-game')

    g.user.current_game.end()
    return {'success': True}


@socketio.on('leave-game')
@login_required
@check_csrf_data
def leave_game(*args):
    if len(args) != 1:
        return fail('invalid-arguments')
    if g.user.current_game is None:
        return fail('not-in-game')

    g.user.leave_game()
    return {'success': True}


@socketio.on('draw-card')
@login_required
@check_csrf_data
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
@login_required
@check_csrf_data
def use_card(*args):
    if len(args) != 1 or not isinstance(args[0], dict) or 'id' not in args[0]:
        return fail('invalid-arguments')

    card = Card(args[0]['id'])
    game = g.user.current_game
    try:
        game.use_card(card, g.user)
    except GameError as e:
        return fail(e)

    return {'success': True}
