import re

from bycycle.core.services.exceptions import InputError
from bycycle.core.services.route import Service, MultipleMatchingAddressesError

from .service import ServiceResource


class Route(ServiceResource):
    """View for interfacing with byCycle Route service."""

    service_class = Service

    def _find(self):
        data = super()._find()
        try:
            route_list = self._get_query()
        except InputError:
            pass
        else:
            data.update({
                'q': ' to '.join(route_list),
                's': route_list[0],
                'e': route_list[1],
            })
        return data

    def _get_query(self):
        params = self.request.params
        q = params.get('q', '')
        if q:
            route_list = re.split('\s+to\s+', q)
            if len(route_list) < 2:
                raise InputError("That doesn't look like a route.")
        else:
            s = params.get('s', '')
            e = params.get('e', '')
            if s and e:
                route_list = [s, e]
            elif s or e:
                if not s:
                    raise InputError('Please enter a start address.')
                else:
                    raise InputError('Please enter an end address.')
            else:
                raise InputError('Please enter something to search for.')
        return route_list

    def _get_options(self):
        options = {}
        for p in ('pref', 'tmode'):
            if p in self.request.params:
                options[p] = self.request.params[p]
        return options

    def _exc_handler(self, exc):
        if isinstance(exc, MultipleMatchingAddressesError):
            self.request.response.status_int = 300
            return {'result': exc.choices}
        return exc
