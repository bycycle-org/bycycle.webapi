from bycycle.core.exc import InputError
from bycycle.core.service.lookup import LookupService, MultipleLookupResultsError

from .service import ServiceResource


class LookupResource(ServiceResource):

    service_class = LookupService

    def get(self):
        data = super()._get()
        status = self.request.response.status_int
        if status == 200:
            results = data['results']
            for result in results:
                self._modify_result(result)
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
        point = self.request.params.get('point')
        if point:
            options['point_hint'] = point
        return options

    def _exc_handler(self, exc):
        if isinstance(exc, MultipleLookupResultsError):
            self.request.response.status_int = 300
            for result in exc.choices:
                self._modify_result(result)
            return {'results': exc.choices}
        return exc

    def _modify_result(self, result):
        """Convert geometry to web projection (3857)."""
        result.geom = result.geom.reproject()
        result.coordinates = result.geom.coords[0]
