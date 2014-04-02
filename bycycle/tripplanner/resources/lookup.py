from bycycle.core.service.lookup import LookupService

from .service import ServiceResource


class Lookup(ServiceResource):

    service_class = LookupService

    def _find(self):
        data = super()._find()
        if isinstance(data['result'], (list, tuple)):
            self.request.response.status = 300
        return data

    def _get_options(self):
        options = {}
        q_id = self.request.params.get('q_id')
        if q_id:
            options['id_hint'] = q_id
        q_point = self.request.params.get('q_point')
        if q_point:
            options['point_hint'] = q_point
        return options
