from bycycle.core.model import Street
from bycycle.core.model.util import get_extent


class InfoResource:

    def __init__(self, request, context=None):
        self.request = request
        self.context = context

    def get(self):
        settings = self.request.registry.settings
        info = {
            'debug': settings['debug'],
            'env': settings['env'],
        }
        info.update(self._get_extent())
        return info

    def _get_extent(self):
        info = get_extent(self.request.dbsession, Street)
        return info._asdict()
