import random

from flask import g
from flask_socketio import join_room
from passlib.hash import bcrypt

from . import app, db, redis_db, socketio
from .errors import DatabaseError, GameError


class Card:
    def __init__(self, card_id):
        def query_by(id_field):
            return (
                'SELECT cards.id, cards.text_id, cards.name, cards.text, cards.visibility,'
                ' cards.duration, cards.type, card_types.name, card_types.base_url'
                ' FROM cards JOIN card_types ON cards.type = card_types.id'
               f' WHERE cards.{id_field} = %s;')
        if isinstance(card_id, int):
            query = query_by('id')
        elif isinstance(card_id, str):
            query = query_by('text_id')
        else:
            # TODO: log this
            raise ValueError('invalid-card-id')
        cur = db.cursor()
        cur.execute(query, [card_id])
        if cur.rowcount == 0:
            cur.close()
            print("Invalid card id:", repr(card_id))
            raise ValueError('invalid-card-id')
        if cur.rowcount > 1:
            pass # TODO: log this
        self.id, self.text_id, self.name, self.text, self.visibility, self.duration, \
            type_id, type_name, self.base_url = cur.fetchone()
        cur.close()
        self.type = {
            'id': type_id,
            'name': type_name
        }


class Game:
    @classmethod
    def create(cls, name, max_players, password=None):
        if not name.strip():
            raise ValueError('empty-name')
        if (max_players < app.config['MAX_PLAYERS_MIN']
                or max_players > app.config['MAX_PLAYERS_MAX']):
            raise ValueError('invalid-max-players')

        password_hash = None
        if password is not None and password.strip():
            password_hash = bcrypt.hash(password.strip())

        cur = db.cursor()
        cur.execute(
            'INSERT INTO games (name, password_hash, creator, max_players)'
            ' VALUES (%s, %s, %s, %s) RETURNING id;',
            [name.strip(), password_hash, g.user.id, max_players])
        if cur.rowcount == 0:
            cur.close()
            # TODO: log this
            raise DatabaseError('insert-failed')
        elif cur.rowcount > 1:
            pass # TODO: log this
        game_id, = cur.fetchone()
        cur.close()

        game = cls(game_id)
        game.add_player(g.user)
        socketio.emit('game-created', game.public_info)
        return game

    def __init__(self, game_id):
        if not isinstance(game_id, int):
            raise ValueError('invalid-game-id')
        cur = db.cursor()
        cur.execute('SELECT id, name, password_hash, creator, max_players, started, ended'
                    ' FROM games WHERE id = %s;', [game_id])
        if cur.rowcount == 0:
            cur.close()
            raise ValueError('invalid-game-id')
        elif cur.rowcount > 1:
            pass # TODO: log this
        self.id, self.name, self.password_hash, creator_id, self.max_players, \
            self.started, self.ended = cur.fetchone()
        from .auth import User
        self.creator = User(creator_id)
        cur.close()

    def add_active_card(self, card, user):
        if user == 'all':
            self.emit('active-card-added', {'cardID': card.id, 'userID': 'all'})
        elif card.visibility == 'all':
            self.emit('active-card-added', {'cardID': card.id, 'userID': user.id})
        else:
            user.emit('active-card-added', {'cardID': card.id, 'userID': user.id})

        if user == 'all':
            key = self.redis_key('active-cards')
            duration = card.duration * self.player_count
        else:
            key = self.redis_key(f'user:{user.id}:active-cards')
            duration = card.duration
        if redis_db.hset(key, card.id, duration) != 1:
            pass # TODO: log this

    def add_player(self, user):
        if self.ended:
            raise GameError('game-ended')
        if self.started:
            raise GameError('game-started')
        if self.player_count >= self.max_players:
            raise GameError('game-full')

        cur = db.cursor()
        cur.execute('INSERT INTO users_games (user_id, game_id) VALUES (%s, %s);',
            [user.id, self.id])
        if cur.rowcount == 0:
            cur.close()
            raise DatabaseError('insert-failed')
        elif cur.rowcount > 1:
            pass # TODO: log this
        cur.close()

        socketio.emit('game-updated', {
            'id': self.id,
            'playerCount': self.player_count
        })
        self.emit('game-joined', {
            'id': user.id,
            'name': user.name
        })
        join_room(self.room)

    def advance_turn(self, next_player=None):
        if self.ended:
            return
        if next_player is None:
            next_player = self.next_player
        self.current_player = next_player

        def check_durations(user_id):
            if user_id == 'all':
                key = self.redis_key('active-cards')
            else:
                key = self.redis_key(f'user:{user_id}:active-cards')
            cards = redis_db.hgetall(key)
            for card_id, duration in cards.items():
                card = Card(int(card_id))
                duration = int(duration)
                if duration == 1:
                    self.remove_active_card(card.id, user_id)
                elif duration > 1:
                    redis_db.hincrby(key, card.id, -1)

        check_durations('all')
        check_durations(self.current_player)

        turn_skips = redis_db.hget(self.redis_key('turn-skips'), self.current_player)
        if turn_skips is not None and int(turn_skips) > 0:
            self.skip_turns(-1, self.current_player)
            self.emit('turn-skipped', {
                'userID': self.current_player,
                'skipsLeft': int(turn_skips) - 1
            })
            self.current_player = self.next_player
        self.emit('new-turn', {'userID': self.current_player})

    @property
    def current_player(self):
        user_id = redis_db.get(self.redis_key('current-player'))
        if user_id is not None:
            user_id = int(user_id)
        return user_id

    @current_player.setter
    def current_player(self, new_player_id):
        redis_db.set(self.redis_key('current-player'), new_player_id)

    def delete(self):
        """Do not use the object after calling this."""
        keys = self.redis_key('*')
        if keys:
            redis_db.delete(*keys)
        cur = db.cursor()
        cur.execute('DELETE FROM users_games WHERE game_id = %s;', [self.id])
        cur.execute('DELETE FROM games WHERE id = %s;', [self.id])
        if cur.rowcount > 1:
            pass # TODO: log this
        cur.close()
        socketio.emit('game-deleted', {'id': self.id})

    def discard(self, card, user):
        redis_db.rpush(self.redis_key('discard'), card.id)
        self.emit('discard', {
            'cardID': card.id,
            'userID': user.id
        })

    def draw_card(self):
        card_id = redis_db.lpop(self.redis_key('deck'))
        if card_id is None:
            # TODO: log this
            raise GameError('draw-from-empty-deck')

        card = Card(int(card_id))
        if card.type['id'] == app.config['USE_CARD_ID']:
            redis_db.rpush(self.redis_key(f'user:{g.user.id}:use-cards'), card.id)
            self.emit('private-card-drawn', {'userID': g.user.id})
            g.user.emit('use-card-added', {'cardID': card.id})
        else:
            if card.duration != 0:
                if card.type['id'] == app.config['ALL_CARD_ID']:
                    self.add_active_card(card, 'all')
                else:
                    self.add_active_card(card, g.user)

            if card.visibility == 'all':
                self.emit('card-drawn', {
                    'cardID': card.id,
                    'userID': g.user.id
                })
            elif card.visibility == 'player':
                self.emit('private-card-drawn', {'userID': g.user.id})

        if redis_db.llen(self.redis_key('deck')) == 0:
            self.end()

        from .cards import after_draw_handlers, card_handlers

        for handler in after_draw_handlers:
            handler(self)

        if (card.type['id'] != app.config['USE_CARD_ID']
                and card.text_id in card_handlers):
            handler_opts = {'advanced_turn': False}
            try:
                handler_opts.update(card_handlers[card.text_id](self))
            except TypeError:
                pass
            if not handler_opts['advanced_turn']:
                self.advance_turn()
        else:
            self.advance_turn()
        return card

    def emit(self, *args):
        return socketio.emit(*args, room=self.room)

    def end(self):
        if self.ended:
            return
        self.started = True
        self.ended = True
        cur = db.cursor()
        cur.execute('UPDATE games SET ended = true WHERE id = %s;', [self.id])
        if cur.rowcount != 1:
            pass # TODO: log this
        self.emit('game-ended')
        cur.close()

    def has_player(self, user_id):
        cur = db.cursor()
        cur.execute('SELECT users_games.user_id FROM users_games'
            ' WHERE users_games.game_id = %s;', [self.id])
        player_ids = [user_id for user_id, in cur]
        print(type(player_ids[0]))
        print(player_ids)
        return user_id in player_ids

    @property
    def joinable(self):
        if self.started or self.ended or self.player_count >= self.max_players:
            return False
        return True

    @property
    def next_player(self):
        if self.current_player is None:
            raise ValueError('no-current-player')
        player_order = redis_db.lrange(self.redis_key('player-order'), 0, -1)
        player_order = [int(x) for x in player_order]
        current_index = player_order.index(self.current_player)
        next_index = (current_index + 1) % len(player_order)
        return player_order[next_index]

    @property
    def password_protected(self):
        return self.password_hash is not None

    @property
    def players(self):
        cur = db.cursor()
        cur.execute('SELECT users.id, users.name'
            ' FROM users_games JOIN users ON users_games.user_id = users.id'
            ' WHERE users_games.game_id = %s;', [self.id])
        players = [{
            'id': user_id,
            'name': username
        } for user_id, username in cur]
        cur.close()
        return players

    @property
    def player_count(self):
        return len(self.players)

    @property
    def public_info(self):
        return {
            'id': self.id,
            'name': self.name,
            'creator': {
                'id': self.creator.id,
                'name': self.creator.name
            },
            'passwordProtected': self.password_protected,
            'playerCount': self.player_count,
            'maxPlayers': self.max_players,
            'started': self.started
        }

    def redis_key(self, key):
        return f'game:{self.id}:{key}'

    def remove_active_card(self, card_id, user_id):
        if user_id == 'all':
            key = self.redis_key('active-cards')
        else:
            key = self.redis_key(f'user:{user_id}:active-cards')
        if redis_db.hdel(key, card_id) != 1:
            pass # TODO: log this
        socketio.emit('active-card-removed', {
            'cardID': card_id,
            'userID': user_id
        })

    def remove_use_card(self, card_id, user):
        key = self.redis_key(f'user:{user.id}:use-cards')
        if redis_db.lrem(key, 1, card_id) != 1:
            pass # TODO: log this
        user.emit('use-card-removed', {'cardID': card_id})

    def remove_player(self, user):
        redis_db.lrem(self.redis_key('player-order'), 0, user.id)
        redis_db.hdel(self.redis_key('turn-skips'), user.id)
        keys = redis_db.keys(self.redis_key(f'{user.id}:*'))
        if keys:
            redis_db.delete(*keys)

        self.emit('game-left', {'userID': user.id})

        if self.player_count == 0:
            self.delete()
        else:
            new_order = [int(player_id) for player_id in
                redis_db.lrange(self.redis_key('player-order'), 0, -1)]
            self.emit('player-order-changed', new_order)
            socketio.emit('game-updated', {
                'id': self.id,
                'playerCount': self.player_count
            })
 
    @property
    def room(self):
        return f'game-{self.id}'

    def skip_turns(self, count, user_id):
        redis_db.hincrby(self.redis_key('turn-skips'), user_id, count)

    def start(self):
        if self.started:
            raise GameError('game-already-started')
        self.started = True
        cur = db.cursor()
        cur.execute('UPDATE games SET started = true WHERE id = %s;', [self.id])
        if cur.rowcount == 0:
            raise DatabaseError('no-such-game')
        elif cur.rowcount > 1:
            pass # TODO: log this

        # Make sure Redis is empty for this game
        keys = self.redis_key('*')
        if keys:
            redis_db.delete(*keys)

        # Randomize player order
        player_ids = [player['id'] for player in self.players]
        random.shuffle(player_ids)
        redis_db.rpush(self.redis_key('player-order'), *player_ids)

        # Randomize deck
        cur.execute('SELECT id FROM cards;')
        card_ids = [card_id for card_id, in cur]
        cur.close()
        random.shuffle(card_ids)
        redis_db.rpush(self.redis_key('deck'), *card_ids)

        first_player = int(redis_db.lindex(self.redis_key('player-order'), 0))
        self.current_player = first_player

        socketio.emit('game-started', {'id': self.id})
        self.emit('player-order-changed', player_ids)
        self.emit('new-turn', {'userID': first_player})

    def use_card(self, card, user):
        key = self.redis_key(f'user:{user.id}:use-cards')
        if str(card.id) not in redis_db.lrange(key, 0, -1):
            raise GameError('card-not-in-hand')

        from .cards import card_handlers
        if card.text_id in card_handlers:
            card_handlers[card.text_id](self)
        else:
            pass # TODO: log this

        self.remove_use_card(card.id, user)
        if card.duration != 0:
            self.add_active_card(card, user)

        self.emit('card-used', {
            'cardID': card.id,
            'userID': user.id
        })
