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
                names = [start.name, end.name]
                ids = [start.id, end.id]
            else:
                start = results[0].start
                end = results[-1].end
                names = [result.start.name for result in results]
                names.append(end.name)
                ids = [result.start.id for result in results]
                ids.append(end.id)

            data.update({
                'from': start.name,
                'from_id': start.id,
                'to': end.name,
                'to_id': end.id,
            })

            data['name'] = ' to '.join(name for name in names if name)
            data['id'] = ';'.join(ids)
        return data

    def _get_query(self):
        params = self.request.params
        term = params.get('term', '').strip()
        if term:
            waypoints = re.split('\s+to\s+', term, re.I)
            if len(waypoints) < 2:
                raise InputError("That doesn't look like a valid directions request")
        else:
            start = params.get('from', '').strip()
            end = params.get('to', '').strip()
            if start and end:
                waypoints = [start, end]
            elif start:
                raise InputError('Please enter a starting point')
            elif end:
                raise InputError('Please enter a destination')
            else:
                raise InputError('Please enter something to search for')
        return waypoints

    def _get_options(self):
        params = self.request.params
        options = {}

        id = params.get('id', '').strip()
        point = params.get('point', '').strip()

        if id:
            ids = id.split(';')
            ids.extend([''] * (2 - len(ids)))
        else:
            from_id = params.get('from_id', '').strip()
            to_id = params.get('to_id', '').strip()
            ids = from_id, to_id

        if point:
            points = point.split(';')
            points.extend([''] * (2 - len(points)))
        else:
            from_point = params.get('from_point', '').strip()
            to_point = params.get('to_point', '').strip()
            points = (from_point, to_point)

        options['ids'] = ids
        options['points'] = points

        return options

    def _exc_handler(self, exc):
        if isinstance(exc, MultipleRouteLookupResultsError):
            self.request.response.status_int = 300
            return {'results': exc.choices}
        return exc
