import random

from . import app


apos = '\u2019' # U+2019 RIGHT SINGLE QUOTATION MARK, used as apostrophe

def base58_random(length):
    alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    return ''.join(random.choice(alphabet) for _ in range(length))


def fail(reason, status=None):
    data = {'success': False, 'reason': str(reason)}
    if status is None:
        return data
    return data, status


def only_arg_dict(args):
    return len(args) == 1 and isinstance(args[0], dict)


def set_cookie(response, name, value, httponly=False, delete=False):
    kwargs = {
        'httponly': httponly,
        'path': app.config['COOKIE_PATH'],
        'samesite': 'Lax',
        'secure': True
    }
    if delete:
        kwargs['expires'] = 0
    else:
        kwargs['max_age'] = 10 * 365 * 24 * 60 * 60

    response.set_cookie(name, value, **kwargs)
