from bycycle.core.services.exceptions import InputError
from bycycle.core.services.route import Service, MultipleMatchingAddressesError

from bycycle.tripplanner.controllers.services import *


class RoutesController(ServicesController):
    """Controller for interfacing with byCycle Route service."""

    def find(self):
        q = request.params.get('q', '').strip()
        if q:
            try:
                q = self._makeRouteList(q)
            except ValueError:
                self.q = q
                self.http_status = 400
                self.exception = InputError("That doesn't look like a route.")
                return self._render_response(template='errors')
        else:
            s = request.params.get('s', '').strip()
            e = request.params.get('e', '').strip()
            if s and e:
                q = [s, e]
            else:
                if s:
                    self.s = s
                    err_msg = 'Please enter an end address.'
                elif e:
                    self.e = e
                    err_msg = 'Please enter a start address.'
                else:
                    err_msg = 'Please enter something to search for.'
                self.http_status = 400
                self.exception = InputError(err_msg)
                return self._render_response(template='errors')
        self.s, self.e = q[0], q[1]
        self.q = '%s to %s' % (q[0], q[1])
        params = {}
        for p in ('pref', 'tmode'):
            if p in request.params:
                params[p] = request.params[p]
        def block(exc):
            try:
                raise exc
            except MultipleMatchingAddressesError, exc:
                self._template = '300'
                self.http_status = 300
                self.title = 'Multiple Matches'
                self.choices = exc.choices
        return super(RoutesController, self)._find(q, service_class=Service,
                                                   block=block, **params)
