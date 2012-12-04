import re

from pyramid.decorator import reify
from pyramid.httpexceptions import HTTPSeeOther
from pyramid.renderers import render_to_response

from bycycle.core.model.entities.public import Region

from bycycle.core.model.regions import getRegionKey


class RegionsView(object):

    entity = Region

    def __init__(self, request):
        self.request = request

    @reify
    def region(self):
        request = self.request
        slug = request.matchdict['id']
        try:
            slug = getRegionKey(slug)
        except ValueError:
            return None
        q = self.request.db_session.query(self.entity)
        q = q.filter_by(slug=slug)
        return q.first()

    def index(self):
        request = self.request

        # If there's a region ID query param, redirect to the canonical
        # URL for the region: /regions/{id}
        params = dict(request.params)
        slug = params.pop('region', None)
        if slug:
            location = request.route_url('region', id=slug, _query=params)
            return HTTPSeeOther(location=location)

        regions = request.db_session.query(self.entity).all()
        q = request.params.get('q', '')
        return {
            'regions': regions,
            'q': q,
        }

    def show(self):
        if self.region is None:
            return self.render_404()

        request = self.request
        slug = request.matchdict['id']
        params = dict(request.params)

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
            renderer = request.matchdict.get('renderer', '')
            location = request.route_url(
                route_name, id=slug, renderer=renderer, _query=params)
            return HTTPSeeOther(location=location)

        return {
            'region': self.region,
            'service': '',
            'q': q,
            's': s,
            'e': e,
        }

    def render_404(self):
        req = self.request
        req.response.status_int = 404
        data = self.index()
        data['info'] = 'Unknown region: "{id}"'.format(**req.matchdict)
        return render_to_response('/regions/index.html', data, req)
