from byCycle.services.geocode import Service, MultipleMatchingAddressesError

from tripplanner.controllers.services import *


class GeocodesController(ServicesController):
    """Controller for interfacing with byCycle Geocode service."""

    def find(self):
        q = request.params.get('q', '')
        self.q = q
        def block(exc):
            try:
                raise exc
            except MultipleMatchingAddressesError, self.exception:
                self.http_status = 300
                self._template = str(self.http_status)
                self.collection = self.exception.geocodes
        _find = super(GeocodesController, self)._find
        return _find(q, service_class=Service, block=block)
