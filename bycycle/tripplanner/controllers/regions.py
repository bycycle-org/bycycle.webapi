from pylons import request, session, url
from pylons.controllers.util import redirect

from bycycle.core.services.exceptions import InputError, NotFoundError
from bycycle.core.model import regions
from bycycle.core.model.entities.public import Region

from bycycle.tripplanner.lib.base import RestController


class RegionsController(RestController):

    entity = Region

    def __before__(self, format=None):
        RestController.__before__(self, format=format)
        self.service = 'services'

    def index(self):
        params = dict(request.params)

        # legacy support
        prefix = 'bycycle_'
        for k in params:
            if k.startswith(prefix):
                params[k.lstrip(prefix)] = params.pop(k)

        if 'exception' in session:
            self.exception = session.pop('exception')
            self.http_status = session.pop('http_status')
            self.q = session.pop('q', None)
            session.save()
            self.regions = self.entity.q().all()
            return self._render(action='errors', code=self.http_status)

        id = self._get_region_id(params.pop('region', None), params)
        if id:
            if 'fr' in params:
                params['s'] = params.pop('fr')
            if 'to' in params:
                params['e'] = params.pop('to')
            if 'q' in params or 's' in params or 'e' in params:
                redirect(url('find_services', region_id=id, **params))
            else:
                redirect(url('region', id=id, **params))
        else:
            return super(RegionsController, self).index()

    def show(self, id):
        """Show the ``region`` with ID or name or key ``id``."""
        id = self._get_region_id(id)
        q = self.db_session.query(self.entity)
        q = q.filter_by(slug=id)
        self.member = q.one()
        return self._render(action=self.region.slug)

    def find(self):
        params = dict(request.params)
        region_id = params.pop('region', None)
        if region_id is not None:
            region_id = self._get_region_id(region_id)
        q = params.get('q', '').strip()
        params.pop('commit', '')
        if region_id is None:
            exc = InputError(
                'You must select a region from the drop down list above or '
                'by clicking one of the Xs on the map.')
            exc.title = 'Please Select a Region'
            session['exception'] = exc
            session['http_status'] = 400
            if params.pop('q', None) is not None:
                session['q'] = q
            session.save()
            return redirect(url('regions', **params))
        elif q:
            # Go to and find something in region
            redirect(url('find_services', region_id=region_id, **params))
        else:
            # Just go to region
            params.pop('q', None)
            redirect(url('region', id=region_id, **params))

    @staticmethod
    def _get_region_id(region_id, params=None):
        """Normalize ``region_id``."""
        try:
            return long(region_id)
        except (ValueError, TypeError):
            try:
                return regions.getRegionKey(region_id)
            except ValueError:
                params = params or dict(request.params)
                q = params.pop('q', None)
                session['exception'] = NotFoundError('Unknown region: %s' %
                                                     region_id)
                session['http_status'] = 404
                if q is not None:
                    session['q'] = q
                session.save()
                params.pop('region', '')
                params.pop('bycycle_region', '')
                redirect(url('regions', **dict(params)))
