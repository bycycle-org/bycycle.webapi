from pylons import config, request, g, session
from pylons import tmpl_context as c
from pylons.controllers import WSGIController
from pylons.controllers.util import abort, redirect_to
from pylons.decorators import validate, jsonify
from pylons.templating import render_mako as render

import restler.controller

from bycycle.core import model

import bycycle.tripplanner.lib.helpers as h


class RestController(restler.controller.Controller):

    default_format = 'html'

    def get_db_session(self):
        return model.Session


class BaseController(WSGIController): pass


__all__ = [
    'BaseController',
    'RestController',
    'WSGIController',
    'abort',
    'c',
    'config',
    'g',
    'h',
    'jsonify',
    'model',
    'redirect_to',
    'render',
    'request',
    'session',
    'validate',
]
