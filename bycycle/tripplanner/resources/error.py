from tangled.web import config

from .service import ServiceResource


class Error(ServiceResource):

    @config('text/html', template='/error.html')
    def GET(self):
        return {
            'error': self._exc_as_dict(self.request.response),
        }
