import re

from pyramid.httpexceptions import exception_response

from .directions import DirectionsResource
from .lookup import LookupResource
from .service import ServiceResource


DIRECTIONS_RE = re.compile(r'.+\s+to\s+.+')


class QueryResource(ServiceResource):

    def get(self):
        req = self.request
        params = req.params

        if not params:
            return {}

        term = params.get('term', '').strip()
        from_ = params.get('from', '').strip()
        to = params.get('to', '').strip()

        if term:
            if DIRECTIONS_RE.match(term):
                view_class = DirectionsResource
            else:
                view_class = LookupResource
        elif from_ or to:
            view_class = DirectionsResource
        else:
            raise exception_response(400)

        view = view_class(self.request)
        return view.get()
