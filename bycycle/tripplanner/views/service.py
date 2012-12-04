from collections import Iterable
import logging
import re

from pyramid.renderers import render, render_to_response

from bycycle.core.model.entities.base import Entity
from bycycle.core.services.exceptions import ByCycleError
from bycycle.core.services.exceptions import InputError, NotFoundError

from bycycle.tripplanner.views.regions import RegionsView


log = logging.getLogger(__name__)


class ServiceView(object):

    def __init__(self, request):
        self.request = request
        self.parent_view = RegionsView(request)
        self.region = self.parent_view.region

    def show(self):
        data = self.parent_view.show()
        data['service'] = self.service_class.name
        return data

    def find(self):
        return self._render(self._find())

    def _find(self):
        """Query service and return data for renderer."""
        if self.region is None:
            return self.parent_view.render_404()
        data = {
            'service': self.service_class.name,
            'region': self.region,
            'q': '',
            's': '',
            'e': '',
            'result': None,
            'json': None,
        }
        service = self.service_class(region=self.region.slug)
        try:
            query = self._get_query()
            options = self._get_options()
            result = service.query(query, **options)
        except InputError as exc:
            self.request.response.status_int = 400
            data['error'] = self._exc_as_dict(exc)
        except NotFoundError as exc:
            self.request.response.status_int = 404
            data['error'] = self._exc_as_dict(exc)
        except ByCycleError as exc:
            extra_data = self._exc_handler(exc)
            if extra_data is exc:
                raise exc
            data['error'] = self._exc_as_dict(exc)
            data.update(extra_data)
        else:
            data['q'] = query
            data['result'] = result
        return data

    def _get_query(self):
        """Return a query the relevant back end service understands.

        Parse request data for query. If bad or missing data is found,
        an InputError may be raised.

        The `q` query param is used as-is by default.

        """
        return self.request.params.get('q', '')

    def _get_options(self):
        """Return keyword args for service.

        Extract service options from query params and return a dict of
        service-specific options (i.e., the **kwargs for the service).
        Like `_get_query()`, this may raise an `InputError`.

        E.g., for a route query: `{'tmode': 'bike', 'pref': 'safer'}`.

        """
        return {}

    def _render(self, data):
        req = self.request
        renderer = req.matchdict.get('renderer')
        best = req.accept.best_match(('text/html', 'application/json'))
        if renderer == '.json' or best == 'application/json':
            return self._render_json(data)
        else:
            return self._render_template(data)

    def _render_template(self, data, as_response=True, include_json=True):
        status = self.request.response.status_int
        if status == 200:
            result = data['result']
            if isinstance(result, Entity):
                template = 'show'
            elif isinstance(result, Iterable):
                template = 'index'
            else:
                raise ValueError(
                    'Unexpected result type: {0.__class__}'.format(result))
        elif status == 300:
            template = '300'
        else:
            template = 'errors'
        directory = self.service_class.name
        path = '/{0}s/{1}.html'.format(directory, template)
        if include_json:
            # Save content type and restore it below. This hackery is
            # necessary because the JSON renderer automatically sets the
            # content type to application/json.
            content_type = self.request.response.content_type
            data['json'] = self._render_json(data.copy(), as_response=False)
            self.request.response.content_type = content_type
        render_func = render_to_response if as_response else render
        return render_func(path, data, request=self.request)

    def _render_json(self, data, as_response=True, include_fragment=True):
        """Render a JSON representation of the result.

        This is the structure of the object::

            results: A list of entities returned from the back end service
            message: A string
            fragment: An HTML fragment representing the result
            error:
                title: A string
                description: A string
                explanation: A string
                errors: A list of strings

        """
        result = data.get('result')
        if result:
            if isinstance(result, Entity):
                results = [result]
            else:
                results = result
        else:
            results = None
        obj = {
            'results': results,
            'message': data.get('message'),
            'error': data.get('error'),
        }
        if include_fragment:
            data = data.copy()
            data['wrap'] = False
            f = self._render_template(
                data, as_response=False, include_json=False)
            f = f.strip()
            f = f.encode('utf-8')
            f = re.sub('\s+', ' ', f)
            obj['fragment'] = f
        render_func = render_to_response if as_response else render
        return render_func('json', obj, request=self.request)

    def _exc_as_dict(self, exc):
        """Given the `ByCycleError` ``exc``, return a dict w/ its attrs.

        The resulting dict is used in both templates and JSON responses.

        """
        return {
            'title': exc.title,
            'description': exc.description,
            'explanation': exc.explanation,
            'errors': getattr(exc, 'errors', None),
        }

    def _exc_handler(self, exc):
        """Exception used by `find()` for unhandled `ByCycleError`s.

        The `find` method handles `NotFoundError`s and `InputError`s
        raised by the back end, converting them to 404 and 400
        responses, respectively.

        This method can be defined to handle *other* subclasses of
        `ByCycleError`. It can return a dict, which will update the dict
        that will be passed to the renderer. It can instead return the
        original exception to signal that it couldn't be handled.

        In particular, the handler will probably want to include
        a `result`. It may also set properties on
        `self.request.response` (e.g., its status code).

        """
        return exc
