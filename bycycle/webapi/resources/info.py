from shapely import wkb
from sqlalchemy.sql import func

from tangled.web import Resource

from bycycle.core.model import Street


class Info(Resource):

    def GET(self):
        settings = self.app.settings
        info = {
            'debug': settings['debug'],
            'env': settings['env'],
            'name': settings['tangled.app.name'],
            'package': settings['package'],
        }
        info.update(self._get_extent())
        return info

    def _get_extent(self):
        q = self.request.db_session.execute(func.ST_Envelope(func.ST_Extent(Street.geom)))
        extent = q.scalar()
        extent = wkb.loads(extent, hex=True)
        return {
            'bbox': extent.bounds,
            'boundary': list(extent.exterior.coords),
            'center': extent.centroid.coords[0],
        }
