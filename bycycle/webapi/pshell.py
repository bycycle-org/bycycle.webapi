from . import model


def setup(env):
    request = env['request']
    request.tm.begin()
    env['dbsession'] = request.dbsession
    env['model'] = model
    env['tm'] = request.tm
