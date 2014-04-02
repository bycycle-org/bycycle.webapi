import re

from bycycle.core.exc import InputError
from bycycle.core.service import RouteService
from bycycle.core.service.route import MultipleLookupResultsError

from .service import ServiceResource


class Route(ServiceResource):
    """View for interfacing with byCycle Route service."""

    service_class = RouteService

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
                's': start.address,#.as_string(sep),
                's_id': start.id,
                'e': end.address,#.as_string(sep),
                'e_id': end.id,
            })

            data['q'] = ' to '.join(a for a in addrs if a)
            data['q_id'] = ';'.join(ids)
        return data

    def _get_query(self):
        params = self.request.params
        q = params.get('q', '')
        if q:
            route_list = re.split('\s+to\s+', q, re.I)
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
        params = self.request.params
        options = {}

        if params.get('q_id'):
            options['ids'] = params['q_id'].split(';')
        else:
            options['ids'] = [params.get('s_id'), params.get('e_id')]

        if params.get('q_point'):
            options['points'] = params['q_point'].split(';')
        else:
            options['points'] = [params.get('s_point'), params.get('e_point')]

        for p in ('pref', 'mode'):
            if p in params:
                options[p] = self.request.params[p]
        return options

    def _exc_handler(self, exc):
        if isinstance(exc, MultipleLookupResultsError):
            self.request.response.status_int = 300
            return {'result': exc.choices}
        return exc
