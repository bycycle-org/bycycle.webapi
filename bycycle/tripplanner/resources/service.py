from collections import Iterable
import logging
import re

from tangled.decorators import reify
from tangled.util import load_object
from tangled.web import Resource, config
from tangled.web.representations import Representation

from bycycle.core.model import Region
from bycycle.core.model.entities.base import Entity
from bycycle.core.model.regions import getRegionKey
from bycycle.core.services.exceptions import ByCycleError
from bycycle.core.services.exceptions import InputError, NotFoundError


log = logging.getLogger(__name__)


route_re = re.compile(r'.+\s+to\s+.+')


class ServiceResource(Resource):

    @reify
    def region(self):
        req = self.request
        if 'region' in req.params:
            try:
                slug = getRegionKey(req.params['region'])
            except ValueError:
                return None
            q = req.db_session.query(Region)
            q = q.filter_by(slug=slug)
            return q.first()

    @property
    def data(self):
        params = self.request.params
        data = {
            'region': self.region,
            'service': '',
            'q': params.get('q', '').strip(),
            'q_id': params.get('q_id', ''),
            's': params.get('s', '').strip(),
            's_id': params.get('s_id', ''),
            'e': params.get('e', '').strip(),
            'e_id': params.get('e_id', ''),
            'result': None,
            'json': None,
        }
        return data

    @config('text/html', template='/layout.html')
    def GET(self):
        return self.data

    def generic_find(self):
        req = self.request
        params = req.params

        q = params.get('q', '').strip()
        s = params.get('s', '').strip()
        e = params.get('e', '').strip()

        if q:
            if route_re.match(q):
                route_name = 'find_route'
            else:
                route_name = 'find_geocode'
        elif s or e:
            route_name = 'find_route'
        else:
            self.request.abort(400)

        location = req.resource_url(route_name, query=req.query_string)
        self.request.abort(303, location=location)

    def find(self):
        return self._render(self._find())

    def _find(self):
        """Query service and return data for renderer."""
        data = self.data
        data['service'] = self.service_class.name
        service = self.service_class(
            self.request.db_session, region=self.region)
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
        return self.request.params.get('q', '').strip()

    def _get_options(self):
        """Return keyword args for service.

        Extract service options from query params and return a dict of
        service-specific options (i.e., the **kwargs for the service).
        Like `_get_query()`, this may raise an `InputError`.

        E.g., for a route query: `{'tmode': 'bike', 'pref': 'safer'}`.

        """
        return {}

    def _render(self, data):
        if self.request.response_content_type == 'application/json':
            return self._render_json(data)
        else:
            return self._render_template(data)

    def _render_template(self, data, for_json=False, include_json=True):
        req = self.request
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
        template_name = '/{0}s/{1}.html'.format(directory, template)
        if for_json:
            self.__template_name = template_name
        else:
            req.resource_config.template = template_name
        if include_json:
            json_data = self._render_json(data.copy())
            json_repr_type = self.app.get(Representation, 'application/json')
            json_repr = json_repr_type(self.app, req, json_data)
            data['json'] = json_repr.content
        return data

    def _render_json(self, data, include_fragment=True):
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
            html_data = data.copy()
            html_data['wrap'] = False
            html_data = self._render_template(html_data, True, False)
            html_repr_type = self.app.get(Representation, 'text/html')
            html_repr = html_repr_type(
                self.app, self.request, html_data,
                template=self.__template_name)
            html = html_repr.content
            html = re.sub('\s+', ' ', html.strip())
            obj['fragment'] = html
        return obj

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
