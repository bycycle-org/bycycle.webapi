from bycycle.core.exc import InputError
from bycycle.core.service.lookup import LookupService

from .service import ServiceResource


class Lookup(ServiceResource):

    service_class = LookupService

    def GET(self):
        data = super()._GET()
        status = self.request.response.status_int
        if status == 200:
            results = data['results']
            if len(results) > 1:
                self.request.response.status = 300
        return data

    def _get_query(self):
        params = self.request.params
        term = params.get('term', '').strip()
        if not term:
            raise InputError('Please enter something to search for.')
        return term

    def _get_options(self):
        options = {}
        id_ = self.request.params.get('id')
        if id_:
            options['id_hint'] = id_
        point = self.request.params.get('point')
        if point:
            options['point_hint'] = point
        return options
