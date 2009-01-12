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
                self._template = '300'
                self.http_status = 300
                self.geocodes = self.exception.geocodes
        return super(GeocodesController, self)._find(q, service_class=Service,
                                                     block=block)
