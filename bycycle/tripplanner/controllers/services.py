import sys, re

import logging

import simplejson

from byCycle.services.exceptions import *
from byCycle.model.geocode import Geocode

from tripplanner.lib.base import *
from tripplanner.lib.base import __all__ as base__all__
from tripplanner.controllers.regions import RegionsController

__all__ = base__all__ + ['ServicesController']


log = logging.getLogger(__name__)

internal_server_error_explanation = """\
An internal error was encountered. An email has been sent to the site administrators informing them of the problem.

If you want to provide more details about the error, please send email to:

<a href="mailto:tripplanner.errros@bycycle.org" title="Report this error">tripplanner.errors@bycycle.org</a>
"""


class ServicesController(RestController):
    """Base class for controllers that interact with back end services."""

    def __before__(self, format='html'):
        RestController.__before__(self, format=format)
        self.service = self.collection_name
        self.region = model.Region.get_by_slug('portlandor')

    def find(self):
        """Generic find method. Expects ``q`` to be set in GET params.

        All this does is see if the value of ``q`` looks like a route
        (something like "123 Main St to 616 SW Pants Ave"); if it does,
        redirect to the route controller's ``find``; otherwise, redirect to
        the geocode controller's ``find``.

        """
        q = request.params.get('q', None)
        s = request.params.get('s', None)
        e = request.params.get('e', None)
        if q is not None:
            try:
                # See if query looks like a route
                request.params['q'] = self._makeRouteList(q)
            except ValueError:
                # Doesn't look like a route; assume it's a geocode
                self.q = q
                controller = 'geocodes'
            else:
                controller = 'routes'
        elif s is not None or e is not None:
            controller = 'routes'
        else:
            self.http_status = 400
            msg = 'Please enter something to search for.'
            self.exception = InputError(msg)
            return self._render(action=self.http_status, code=self.http_status)
        redirect_to(
            h.url_for(
                region_id=self.region.slug,
                controller=controller, action='find'),
            **dict(request.params))

    def _find(self, query, service_class, block=None, **params):
        """Show the result of ``query``ing a service.

        Subclasses should return this method. In other words, they should call
        this and return the result... unless a service-specific ByCycleError
        is encountered, in which case control should return to the subclass to
        handle the error and render the result.

        ``query``
            Query in form that back end service understands

        ``service_class``
            Back end service subclass (e.g., route.Service)

        ``params``
            Optional service-specific parameters
            E.g., for route, tmode=bike, pref=safer

        """
        service = service_class(region=self.region.slug)

        try:
            result = service.query(query, **params)
        except InputError, self.exception:
            self.http_status = 400
        except NotFoundError, self.exception:
            self.http_status = 404
        except ByCycleError, self.exception:
            # Let subclass deal with any other `ByCycleError`. The ``block``
            # function MUST set ``self.http_status`` and MAY set
            # ``self._template``.
            if not block:
                raise
            block(self.exception)
        except Exception, self.exception:
            self.http_status = 500
            self.exception.title = 'Internal Server Error'
            self.exception.description = str(self.exception)
            self.exception.explanation = internal_server_error_explanation
        else:
            self.http_status = 200
            try:
                # Is the result a collection? Note that member objects should
                # not be iterable!
                result[0]
            except TypeError:
                # No, it's a single object (AKA member)
                self.member = result
                template = 'show'
                log.debug('Found member')
            else:
                # Yes
                self.collection = result
                template = 'index'
                log.debug('Found collection')

        try:
            # Was there an error?
            self.exception
        except AttributeError:
            pass
        else:
            self.exception = self.exception
            template = getattr(self, '_template', 'errors')
            if self.http_status == 500:
                if g.debug:
                    raise self.exception
                else:
                    # TODO: Make this send the request details also. Currently,
                    # it doesn't send the request URL, PATH_INFO, etc.
                    err_handler = g.error_handler.exception_handler
                    err_handler(sys.exc_info(), request.environ)

        return self._render(action=template, code=self.http_status)

    def _render_template(self, json=True, **kwargs):
        if json:
            # Inject JSON into template, so the UI can initialize from it
            json_obj = self._get_json_object(action=kwargs['action'])
            self.json = simplejson.dumps(json_obj)
        return super(ServicesController, self)._render_template(**kwargs)

    def _get_json_object(self, action=None, wrap=True, fragment=True, block=None):
        def block(obj):
            result = {
                'type': self.Entity.__name__,
                'results': (obj if isinstance(obj, list) else [obj]),
            }

            msg = getattr(self, 'message', None)
            if msg is not None:
                result['message'] = msg

            exc = getattr(self, 'exception', None)
            if exc is not None:
                result['exception'] = {
                    'code': self.http_status,
                    'title': getattr(exc, 'title', None),
                    'description': getattr(exc, 'description', None),
                    'explanation': getattr(exc, 'explanation', None),
                    'errors': getattr(exc, 'errors', None),
                }

            if fragment:
                wrap = self.wrap
                self.wrap = False
                args = dict(action=action, format='html')
                f = super(ServicesController, self)._render_template(**args)
                self.wrap = wrap
                f = f.strip().replace('\n', ' ')
                for i in range(10, 0, -1):
                    f = f.replace(' ' * i, ' ')
                result['fragment'] = f

            # ``choices`` may be set when HTTP status is 300
            choices = []
            for choice in getattr(self, 'choices', []):
                if isinstance(choice, Geocode):
                    choices.append(choice.to_simple_object())
                else:
                    choices.append([m.to_simple_object() for m in choice])
            if choices:
                result['choices'] = choices

            return result
        return super(ServicesController, self)._get_json_object(block=block)

    def _makeRouteList(self, q):
        """Try to parse a route list from the given query, ``q``.

        The query can be . A ValueError is raised if query
        can't be parsed as a list of at least two strings.

        ``q``
            Either a string with waypoints separated by ' to ' or a string
            that will eval as a list

        return
            A list of route waypoints

        raise `ValueError`
            Query can't be parsed as a list of two or more items

        """
        try:
            route_list = eval(q)
        except:
            sRe = '\s+to\s+'
            oRe = re.compile(sRe, re.I)
            route_list = re.split(oRe, q)
        if not (isinstance(route_list, list) and len(route_list) > 1):
            raise ValueError(
                '%s cannot be parsed as a list of two or more items.' % q
            )
        return route_list
