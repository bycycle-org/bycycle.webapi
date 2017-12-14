import re

from bycycle.core.exc import InputError
from bycycle.core.service import RouteService
from bycycle.core.service.route import MultipleRouteLookupResultsError

from .service import ServiceResource


class Directions(ServiceResource):

    service_class = RouteService

    def GET(self):
        data = super()._GET()
        status = self.request.response.status_int
        if status == 200:
            results = data['results']

            if len(results) == 1:
                result = results[0]
                start = result.start
                end = result.end
                addrs = [start.name, end.name]
                ids = [start.id, end.id]
            else:
                start = results[0].start
                end = results[0].end
                last_end = results[-1].end
                addrs = [g.start.name for g in results]
                addrs.append(last_end.name)
                ids = [g.start.id for g in results]
                ids.append(last_end.id)

            data.update({
                'from': start.name,
                'from_id': start.id,
                'to': end.name,
                'to_id': end.id,
            })

            data['term'] = ' to '.join(a for a in addrs if a)
            data['id'] = ';'.join(ids)
        return data

    def _get_query(self):
        params = self.request.params
        term = params.get('term', '').strip()
        if term:
            waypoints = re.split('\s+to\s+', term, re.I)
            if len(waypoints) < 2:
                raise InputError("That doesn't look like a valid directions request.")
        else:
            start = params.get('from', '').strip()
            end = params.get('to', '').strip()
            if start and end:
                waypoints = [start, end]
            elif start:
                raise InputError('Please enter a starting point.')
            elif end:
                raise InputError('Please enter a destination.')
            else:
                raise InputError('Please enter something to search for.')
        return waypoints

    def _get_options(self):
        params = self.request.params
        options = {}

        if params.get('id'):
            options['ids'] = params['id'].split(';')
        else:
            options['ids'] = [params.get('from_id'), params.get('to_id')]

        if params.get('point'):
            options['points'] = params['point'].split(';')
        else:
            options['points'] = [params.get('from_point'), params.get('to_point')]

        for name in ('pref', 'mode'):
            if name in params:
                options[name] = self.request.params[name]
        return options

    def _exc_handler(self, exc):
        if isinstance(exc, MultipleRouteLookupResultsError):
            self.request.response.status_int = 300
            return {'results': exc.choices}
        return exc
