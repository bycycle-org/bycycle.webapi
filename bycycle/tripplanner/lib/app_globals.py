from pylons import config


class Globals(object):
    def __init__(self):
        self.debug = config['debug']
