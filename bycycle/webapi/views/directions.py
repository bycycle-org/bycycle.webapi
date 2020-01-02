import re

from bycycle.core.exc import InputError
from bycycle.core.service import RouteService
from bycycle.core.service.route import MultipleRouteLookupResultsError

from .service import ServiceResource


class DirectionsResource(ServiceResource):

    service_class = RouteService

    def get(self):
        data = super()._get()
        status = self.request.response.status_int
        if status == 200:
            results = data['results']

            if len(results) == 1:
                result = results[0]
                start = result.start
                end = result.end
                names = [start.name, end.name]
            else:
                start = results[0].start
                end = results[-1].end
                names = [result.start.name for result in results]
                names.append(end.name)

            overall_distance = results[0].distance.copy()
            for unit in overall_distance:
                overall_distance[unit] = 0

            for result in results:
                self._modify_result(result)
                self._modify_lookup_result((result.start, result.end))
                distance = result.distance
                overall_distance['meters'] += distance['meters']
                overall_distance['kilometers'] += distance['kilometers']
                overall_distance['miles'] += distance['miles']
                overall_distance['feet'] += distance['feet']

            data.update({
                'name': ' to '.join(name for name in names if name),
                'start': start,
                'end': end,
                'distance': overall_distance,
            })

        return data

    def _get_query(self):
        params = self.request.params
        term = params.get('term', '').strip()
        if term:
            waypoints = re.split('\s+to\s+', term, re.I)
            if len(waypoints) < 2:
                raise InputError("That doesn't look like a valid directions request")
        else:
            waypoints = params.get('waypoints', '').strip()

            if waypoints:
                waypoints = waypoints.split(';')
                start, *rest = waypoints
                end = rest[-1] if rest else None
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
        points = params.get('points', '').strip()
        if points:
            points = points.split(';')
        else:
            from_point = params.get('from_point', '').strip()
            to_point = params.get('to_point', '').strip()
            points = (from_point, to_point)
        options = {
            'points': points,
        }
        return options

    def _exc_handler(self, exc):
        if isinstance(exc, MultipleRouteLookupResultsError):
            self.request.response.status_int = 300
            results = exc.choices
            for result in results:
                self._modify_lookup_result(result)
            return {'results': results}
        return exc

    def _modify_result(self, result):
        """Convert route geometry to web projection (3857)."""
        result.linestring = result.linestring.reproject()
        result.bounds = result.linestring.bounds
        for direction in result.directions:
            direction['point'] = direction['point'].reproject()

    def _modify_lookup_result(self, result):
        """Convert lookup geometry to web projection (3857)."""
        if isinstance(result, (list, tuple)):
            for choice in result:
                self._modify_lookup_result(choice)
        else:
            geom = result.geom.reproject()
            result.geom = geom
            result.point = geom
