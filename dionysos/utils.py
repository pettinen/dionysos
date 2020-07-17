import random


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
