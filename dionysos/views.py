from flask import g, jsonify, make_response, render_template, request
from passlib.hash import bcrypt

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
@app.route('/game/<game_id>')
@login_optional
def index(game_id=None):
    # Language setting should really be in middleware
    set_lang_cookie = False
    lang_cookie = request.cookies.get(app.config['LANGUAGE_COOKIE'])
    if lang_cookie is not None:
        if lang_cookie in app.config['LANGUAGES']:
            language = lang_cookie
        else:
            language = app.config['DEFAULT_LANGUAGE']
            set_lang_cookie = True
    else:
        language = request.accept_languages.best_match(app.config['LANGUAGES'],
            default=app.config['DEFAULT_LANGUAGE'])
        set_lang_cookie = True
    g.language = language

    response = make_response(render_template('index.html', game_id=game_id))
    set_csrf_cookie(response)
    if set_lang_cookie:
        response.set_cookie(app.config['LANGUAGE_COOKIE'], language,
            secure=True, samesite='Lax')
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

@app.route('/register', methods=['POST'])
@check_csrf_header
def register():
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

    if len(username) > app.config['USERNAME_MAX_LENGTH']:
        return fail('username-too-long')
    if len(password) < app.config['PASSWORD_MIN_LENGTH']:
        return fail('password-too-short')

    cur = db.cursor()
    cur.execute('SELECT id FROM users WHERE lower(name) = lower(%s);', [username])
    if cur.rowcount != 0:
        cur.close()
        return fail('user-exists')

    password_hash = bcrypt.hash(password)
    cur.execute('INSERT INTO users (name, password_hash) VALUES (%s, %s) RETURNING id;',
        [username, password_hash])
    if cur.rowcount != 1:
        pass # TODO: log this

    user_id = cur.fetchone()
    if user_id is None:
        # TODO: log this
        return fail('error')

    user = User(user_id[0])
    response = jsonify({
        'success': True,
        'user': {
            'id': user.id,
            'name': user.name
        }
    })
    set_jwt_cookie(response, user)
    set_csrf_cookie(response)
    print(response)
    return response
