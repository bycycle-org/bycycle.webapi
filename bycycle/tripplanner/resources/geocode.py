from bycycle.core.services.geocode import Service
from bycycle.core.services.geocode import MultipleMatchingAddressesError

from .service import ServiceResource


class Geocode(ServiceResource):
    """View for interfacing with byCycle Geocode service."""

    service_class = Service

    def _find(self):
        data = super()._find()
        result = data['result']
        if self.request.response.status_int == 200:
            data.update(
                q=str(result.address).replace('\n', ', '),
                q_id=result.id)
        return data

    def _get_query(self):
        q = self.request.params.get('q', '')
        q_id = self.request.params.get('q_id', '')
        if q_id:
            q = ';'.join((q, q_id))
        return q

    def _exc_handler(self, exc):
        if isinstance(exc, MultipleMatchingAddressesError):
            self.request.response.status_int = 300
            return {'result': exc.geocodes}
        return exc
