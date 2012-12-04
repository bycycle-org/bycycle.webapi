from bycycle.core.services.geocode import Service
from bycycle.core.services.geocode import MultipleMatchingAddressesError

from bycycle.tripplanner.views.service import ServiceView


class GeocodeView(ServiceView):
    """View for interfacing with byCycle Geocode service."""

    service_class = Service

    def _exc_handler(self, exc):
        if isinstance(exc, MultipleMatchingAddressesError):
            self.request.response.status_int = 300
            return {'result': exc.geocodes}
        return exc
