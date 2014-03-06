from webob.exc import HTTPNotFound

from tangled.web import config

from .service import ServiceResource


class Error(ServiceResource):

    @property
    def region(self):
        try:
            return super().region
        except HTTPNotFound:
            return None

    @property
    def data(self):
        data = super().data
        data['error'] = self._exc_as_dict(self.request.response)
        return data

    @config('text/html', template='/error.html')
    def GET(self):
        return self.data
