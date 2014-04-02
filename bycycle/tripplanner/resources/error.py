from webob.exc import HTTPNotFound

from tangled.decorators import reify
from tangled.web import config

from .service import ServiceResource


class Error(ServiceResource):

    @property
    def data(self):
        data = super().data
        data['error'] = self._exc_as_dict(self.request.response)
        return data

    @config('text/html', template='/error.html')
    def GET(self):
        return self.data
