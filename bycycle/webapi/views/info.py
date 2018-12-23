from shapely import wkb

from sqlalchemy.sql import func

from bycycle.core.model import Street


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
        q = self.request.dbsession.execute(func.ST_Envelope(func.ST_Extent(Street.geom)))
        extent = q.scalar()
        extent = wkb.loads(extent, hex=True)
        return {
            'bbox': extent.bounds,
            'boundary': list(extent.exterior.coords),
            'center': extent.centroid.coords[0],
        }
