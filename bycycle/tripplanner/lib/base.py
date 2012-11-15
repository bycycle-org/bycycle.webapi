from pylons.controllers import WSGIController

import restler.controller

from bycycle.core import model



class RestController(restler.controller.Controller):

    default_format = 'html'

    def get_db_session(self):
        return model.Session


class BaseController(WSGIController): pass

