import logging

from bycycle.core.exc import ByCycleError, InputError, NotFoundError
from bycycle.core.geometry import is_coord
from bycycle.core.model import Entity, Street
from bycycle.core.model.util import get_extent


log = logging.getLogger(__name__)


class ServiceResource:

    def __init__(self, request, context=None):
        self.request = request
        self.context = context

    def _get(self):
        """Query service and return data."""
        data = {
            'service': self.service_class.name,
        }
        service = self._get_service()
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
            data['term'] = query
            data['results'] = [result] if isinstance(result, Entity) else result
        return data

    def _get_service(self):
        """Return configured service instance."""
        config = self._get_config()
        return self.service_class(self.request.dbsession, **config)

    def _get_config(self):
        """Get configuration for service.

        Extract service config from query params and return a dict of
        keyword args that will be passed when constructing the service
        instance.

        Raises:
            InputError: On bad input

        """
        center = self.request.params.get('center', '').strip()
        if center:
            coords = center.split(',')
            coords = tuple(c.strip() for c in coords)
            coords = tuple(c for c in coords if c)
            if not (len(center) == 2 and all(is_coord(c for c in coords))):
                raise InputError('center param must contain exactly 2 numbers (comma separated)')
            center = tuple(float(c) for c in coords)

        bbox = self.request.params.get('bbox', '').strip()
        if bbox:
            coords = bbox.split(',')
            coords = tuple(c.strip() for c in coords)
            coords = tuple(c for c in coords if c)
            if not (len(coords) == 4 and all(is_coord(c for c in coords))):
                raise InputError('bbox param must contain exactly 4 numbers (comma separated)')
            if coords[0] > coords[2]:
                raise InputError('bbox param minx must be less than maxx')
            if coords[1] > coords[3]:
                raise InputError('bbox param miny must be less than maxy')
            bbox = tuple(float(c) for c in coords)
        else:
            bbox = get_extent(self.request.dbsession, Street).bbox

        settings = self.request.registry.settings

        return {
            'center': center or None,
            'bbox': bbox or None,
        }

    def _get_query(self):
        """Return a query the back end service understands.

        Parse request data for query to send to back end service. The
        `term` query param, stripped of leading and trailing whitespace,
        is used by default.

        Raises:
            InputError: On bad input (missing or malformed data)

        """
        return self.request.params.get('term', '').strip()

    def _get_options(self):
        """Return keyword args for querying service.

        Extract service query options from request query params and
        return a dict of service-specific options (i.e., the **kwargs
        for the service's `query` method).

        Raises:
            InputError: On bad input

        """
        return {}

    def _exc_as_dict(self, exc):
        """Given the `ByCycleError` ``exc``, return a dict w/ its attrs.

        The resulting dict is used in both templates and JSON responses.

        """
        return {
            'title': exc.title,
            'explanation': exc.explanation,
            'detail': exc.detail,
        }

    def _exc_handler(self, exc):
        """Exception used by `find()` for unhandled `ByCycleError`s.

        The `GET` method handles `InputError`s and `NotFoundError`s
        raised by the back end, converting them to 400 and 404
        responses, respectively.

        This method can be defined to handle *other* subclasses of
        `ByCycleError`. It can return a dict, which will update the dict
        that will be passed to the renderer. It can instead return the
        original exception to signal that it couldn't be handled.

        In particular, the handler will probably want to include
        `results`. It may also set properties on `self.request.response`
        (e.g., its status code).

        """
        return exc
