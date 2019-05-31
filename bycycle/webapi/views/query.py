import re

from bycycle.core.exc import InputError

from .directions import DirectionsResource
from .lookup import LookupResource
from .service import ServiceResource


DIRECTIONS_RE = re.compile(r'.+\s+to\s+.+')


class QueryResource(ServiceResource):

    def get(self):
        try:
            return self._get()
        except InputError as exc:
            self.request.response.status_int = 400
            return {
                'service': 'query',
                'error': self._exc_as_dict(exc)
            }

    def _get(self):
        req = self.request
        params = req.params
        has_directions_params = 'from' in params or 'to' in params

        if 'term'in params:
            if has_directions_params:
                self.request.response.status_int = 400
                raise InputError(
                    'Query service accepts *either* the `term` query parameter *or* the `from` '
                    'and `to` query parameters')
            term = params.get('term', '').strip()
            if DIRECTIONS_RE.match(term):
                view_class = DirectionsResource
            else:
                view_class = LookupResource
        elif has_directions_params:
            view_class = DirectionsResource
        else:
            raise InputError(
                'Query service requires at least one of the following query parameter: '
                '`term`, `from`, or `to`')

        view = view_class(self.request)
        return view.get()
