import re

from bycycle.core.services.exceptions import InputError
from bycycle.core.services.route import Service, MultipleMatchingAddressesError

from .service import ServiceResource


class Route(ServiceResource):
    """View for interfacing with byCycle Route service."""

    service_class = Service

    def _find(self):
        data = super()._find()
        result = data['result']
        status = self.request.response.status_int
        if status == 200:
            sep = ', '

            if isinstance(result, list):
                start = result[0].start
                end = result[0].end
                last_end = result[-1].end
                addrs = [g.start.address for g in result]
                addrs.append(last_end.address)
                ids = [g.start.id for g in result]
                ids.append(last_end.id)
            else:
                start = result.start
                end = result.end
                addrs = [start.address, end.address]
                ids = [start.id, end.id]

            data.update({
                's': start.address.as_string(sep),
                's_id': start.id,
                'e': end.address.as_string(sep),
                'e_id': end.id,
            })

            data['q'] = ' to '.join(a.as_string(sep) for a in addrs)
            data['q_id'] = ';'.join(ids)
        return data

    def _get_query(self):
        params = self.request.params
        q = params.get('q', '')
        if q:
            route_list = re.split('\s+to\s+', q, re.I)
            if len(route_list) < 2:
                raise InputError("That doesn't look like a route.")
            ids = params.get('q_id')
            if ids:
                ids = ids.split(';')
                for i, addr in enumerate(route_list):
                    addr_id = ids[i]
                    if addr_id:
                        route_list[i] = ';'.join((addr, addr_id))
        else:
            s = params.get('s', '')
            s_id = params.get('s_id', '')
            e = params.get('e', '')
            e_id = params.get('e_id', '')
            if s and e:
                if s_id:
                    s = ';'.join((s, s_id))
                if e_id:
                    e = ';'.join((e, e_id))
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
