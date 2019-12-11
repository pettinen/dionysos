def fail(reason, status=None):
    data = {'success': False, 'reason': str(reason)}
    if status is None:
        return data
    return data, status
