from flask import g, jsonify, make_response, render_template, request

from . import app, db, redis_db
from .auth import (
    check_csrf_header,
    login_optional,
    login_required,
    set_jwt_cookie,
    set_csrf_cookie,
    unset_jwt_cookie,
    User
)
from .game import Card, Game
from .utils import fail


@app.route('/')
@login_optional
def index():
    response = make_response(render_template('index.html', user=g.user))
    if not request.cookies.get(app.config['CSRF_COOKIE']):
        set_csrf_cookie(response)
    return response


@app.route('/cards')
def cards_list():
    cur = db.cursor()
    cur.execute('SELECT id, name FROM card_types ORDER BY name;')
    def quote(name):
        if name in ['Use', 'All']:
            name = f'\u201C{name}\u201D'
        return name
    card_types = [{'id': id, 'name': quote(name)} for id, name in cur.fetchall()]

    cards = {type['id']: [] for type in card_types}
    cur.execute('SELECT type, name, text FROM all_cards ORDER BY text_id;')
    for type, name, text in cur:
        cards[type].append({'name': name, 'text': text})
    cur.close()
    return render_template('cards-list.html', cards=cards, card_types=card_types)


@app.route('/cards.json')
def cards():
    cur = db.cursor()
    cur.execute('SELECT id FROM cards;')
    cards = []
    for card_id, in cur:
        card = Card(card_id)
        cards.append({
            'id': card.id,
            'name': card.name,
            'type': card.type['name'],
            'text': card.text,
            'imgURL': f'{card.text_id}.{app.config["CARD_IMG_EXT"]}',
            'baseURL': card.base_url
        })
    cur.close()
    return jsonify(cards)


@app.route('/games.json')
def games():
    cur = db.cursor()
    cur.execute('SELECT id FROM games;')
    games = []
    for game_id, in cur:
        game = Game(game_id)
        games.append(game.public_info)
    cur.close()
    return jsonify(games)


@app.route('/login', methods=['POST'])
@check_csrf_header
def login():
    data = request.get_json()
    if data is None:
        return fail('json-loading-failed')

    username = data.get('username')
    if username is None or not isinstance(username, str) or not username.strip():
        return fail('empty-username')
    password = data.get('password')
    if password is None or not isinstance(password, str) or not password.strip():
        return fail('empty-password')

    username = username.strip()
    password = password.strip()

    cur = db.cursor()
    cur.execute('SELECT id, password_hash FROM users WHERE lower(name) = lower(%s);',
        [username])
    if cur.rowcount > 1:
        cur.close()
        return fail('db-error')
    elif cur.rowcount == 0:
        cur.close()
        return fail('wrong-credentials')

    user_id, password_hash = cur.fetchone()
    cur.close()

    user = User(user_id)
    if not user.verify_password(password):
        return fail('wrong-credentials')

    response = jsonify({
        'success': True,
        'user': {
            'id': user.id,
            'name': user.name
        }
    })
    set_jwt_cookie(response, user)
    set_csrf_cookie(response)
    return response


@app.route('/logout', methods=['POST'])
@login_required
@check_csrf_header
def logout():
    redis_db.hdel('user-sids', g.user.id)

    response = jsonify({'success': True})
    unset_jwt_cookie(response)
    return response
