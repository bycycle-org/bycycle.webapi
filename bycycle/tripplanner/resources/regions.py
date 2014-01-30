import re

from tangled.decorators import reify
from tangled.web import Resource, config

from bycycle.core.model.entities import public

from bycycle.core.model.regions import getRegionKey


class Regions(Resource):

    entity = public.Region

    @reify
    def region(self):
        slug = self.urlvars['id']
        try:
            slug = getRegionKey(slug)
        except ValueError:
            return None
        q = self.request.db_session.query(self.entity)
        q = q.filter_by(slug=slug)
        return q.first()

    @config('text/html', template='/regions/index.html')
    def GET(self):
        req = self.request

        # If there's a region ID query param, redirect to the canonical
        # URL for the region: /regions/<id>
        params = dict(req.params)
        slug = params.pop('region', None)
        if slug:
            location = req.resource_url('region', {'id': slug}, query=params)
            req.abort(303, location=location)

        regions = req.db_session.query(self.entity).all()
        q = req.params.get('q', '')
        return {
            'regions': regions,
            'q': q,
        }


class Region(Resource):

    entity = public.Region

    @reify
    def region(self):
        slug = self.urlvars['id']
        try:
            slug = getRegionKey(slug)
        except ValueError:
            return None
        q = self.request.db_session.query(self.entity)
        q = q.filter_by(slug=slug)
        return q.first()

    @config('text/html', template='/regions/show.html')
    def GET(self):
        req = self.request

        if self.region is None:
            self.abort(307, location=req.resource_url('regions'))

        slug = self.urlvars['id']
        params = dict(req.params)

        # If there are service-related query params, redirect to the
        # appropriate service.
        q = params.pop('q', '')
        s = params.pop('s', '')
        e = params.pop('e', '')
        if q or s or e:
            if q:
                route_list = re.split('\s+to\s+', q)
                if len(route_list) > 1:
                    route_name = 'find_route'
                else:
                    route_name = 'find_geocode'
                params['q'] = q
            elif s or e:
                route_name = 'find_route'
                if s:
                    params['s'] = s
                if e:
                    params['e'] = e
            renderer = self.urlvars.get('renderer', '')
            location = req.route_url(
                route_name, id=slug, renderer=renderer, _query=params)
            return req.abort(307, location=location)

        return {
            'region': self.region,
            'service': '',
            'q': q,
            's': s,
            'e': e,
        }
