from pylons.controllers import WSGIController

import restler.controller

from bycycle.core import model



class RestController(restler.controller.Controller):

    default_format = 'html'
    
    def __before__(self, format=None):
        kw = {}
        if format is not None:
            kw['format'] = format
        super(RestController, self).__before__(**kw)
        self.e = None
        self.exception = None
        self.http_status = None
        self.info = None
        self.json = None
        self.q = None
        self.region = None
        self.s = None
        self.service = None
        self.status = None
        self.wrap = self.wrap

    def get_db_session(self):
        return model.Session


class BaseController(WSGIController): pass

