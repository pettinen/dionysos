import random

from flask import g

from . import redis_db, socketio
from .auth import User
from .errors import DatabaseError
from .game import Card


# The card handlers in this file assume that the drawn card
# has already been removed from the deck.


def use_skip_turns(game, count):
    if g.user.id == game.current_player:
        count -= 1
        game.advance_turn()
    if count > 0:
        game.skip_turns(count, g.user.id)


# Use: Skip the next five turns.
def artist(game):
    return use_skip_turns(game, 5)


# Action: Draw the next card.
def daring(game):
    game.advance_turn(game.current_player)
    return {'advanced_turn': True}


# Action: Skip the next turn.
def distracted(game):
    game.skip_turns(1, g.user.id)


# Use: Skip the next turn.
def gotta_go_fast(game):
    return use_skip_turns(game, 1)


# Action: Take all other players' permanent cards.
def greed(game):
    my_cards = game.redis_key(f'user:{g.user.id}:active-cards')
    user_ids = [player['id'] for player in game.players]
    for from_user_id in user_ids:
        if from_user_id == game.current_player:
            continue
        other_cards = game.redis_key(f'user:{from_user_id}:active-cards')
        cards = redis_db.hgetall(game.redis_key(other_cards))
        for card_id in cards:
            card = Card(int(card_id))
            if card.type['id'] == app.config['PERMANENT_CARD_ID']:
                game.remove_active_card(card.id, from_user_id)
                # The Spidey Sense card must be discarded if other players know of it.
                if card.text_id == 'spidey_sense':
                    game.discard(card, User(from_user_id))
                else:
                    game.add_active_card(card.id, g.user)
    game.emit('card-effect', {
        'message': f"{g.user.name} takes other players' permanent cards."
    })


# Action: Shuffle the deck and put this card at the bottom of the deck.
def magic(game):
    card = Card('magic')
    deck = redis_db.lrange(game.redis_key('deck'), 0, -1)
    random.shuffle(deck)
    deck.append(card.id)
    redis_db.delete(game.redis_key('deck'))
    redis_db.rpush(game.redis_key('deck'), *deck)
    game.emit('card-effect', {
        'message': "The deck was shuffled and the drawn card sent to the bottom of the deck."
    })


# Use: Skip the next three turns.
def to_the_loo(game):
    return use_skip_turns(game, 3)


# Action: Discard two cards from the top of the deck.
def too_many_cards(game):
    redis_db.ltrim(game.redis_key('deck'), 2, -1)
    if redis_db.llen(game.redis_key('deck')) == 0:
        game.end()
    for handler in after_draw_handlers:
        handler(game)


card_handlers = {
    'daring': daring,
    'greed': greed,
    'artist': artist,
    'magic': magic,
    'gotta_go_fast': gotta_go_fast,
    'distracted': distracted,
    'to_the_loo': to_the_loo,
    'too_many_cards': too_many_cards
}


# Permanent: Give away all "use" cards
def generosity(game):
    card = Card('generosity')
    if redis_db.hexists(game.redis_key(f'user:{g.user.id}:active-cards'), card.id):
        use_cards = [int(card_id) for card_id in
            redis_db.lrange(game.redis_key(f'user:{g.user.id}:use-cards'), 0, -1)]
        for card_id in use_cards:
            game.remove_use_card(card_id, g.user)
            game.emit('card-effect', {
                'message': f"{g.user.name} gives away a use card with a smile."
            })


# Permanent: See the next card in deck
def spidey_sense(game):
    card = Card('spidey_sense')
    for user in game.players:
        user_id = user['id']
        key = game.redis_key(f'user:{user_id}:active-cards')
        if redis_db.hexists(key, card.id):
            next_card = redis_db.lindex(game.redis_key('deck'), 0)
            if next_card is not None:
                User(user_id).emit('spidey-sense-tingling', {'id': int(next_card)})


after_draw_handlers = [
    generosity,
    spidey_sense
]
