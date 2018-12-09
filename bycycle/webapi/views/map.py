import logging

import mercantile

from pyramid.response import Response

from zope.sqlalchemy import mark_changed

from bycycle.core.geometry import make_transformer
from bycycle.core.geometry.sqltypes import Geometry
from bycycle.core.model import MVTCache


log = logging.getLogger(__name__)


MVT_STATEMENT = """
    SELECT
      ST_AsMVT(q, '{layer_name}', NULL, '{column}')
    FROM (
      SELECT
        {properties},
        ST_AsMVTGeom(
          "{column}",
          ST_MakeBox2D(ST_Point(:minx, :miny), ST_Point(:maxx, :maxy))
        ) AS geom
      FROM
        {table}
      WHERE
        ST_Intersects("{column}", ST_MakeEnvelope(:minx, :miny, :maxx, :maxy, {srid}))
    ) AS q;
"""


MVT_CACHE_STATEMENT = f'SELECT "data" FROM "mvt_cache" WHERE "key" = :key'


def make_mvt_view(table, column=None, layer_name=None, srid=None, properties=None):
    if isinstance(table, str):
        if not properties:
            raise TypeError('properties must be specified when table is a string')
    else:
        if hasattr(table, '__table__'):
            table = table.__table__

        if not column:
            for c in table.columns:
                if isinstance(c.type, Geometry):
                    column = c.name
                    srid = srid or c.type.srid
                    break

        properties = properties or tuple(c.name for c in table.columns if c.name != column)
        table = table.name

    column = column or 'geom'
    layer_name = layer_name or table
    srid = srid or 3857
    properties = ', '.join('"%s"' % name for name in properties)
    statement = MVT_STATEMENT.strip().format_map(locals())
    projector = make_transformer(4326, srid)

    def view(request):
        dbsession = request.dbsession
        urlvars = request.matchdict

        x = urlvars['x']
        y = urlvars['y']
        z = urlvars['z']

        cache_key = ','.join((table, column, x, y, z))
        cached_record = dbsession.execute(MVT_CACHE_STATEMENT, params={'key': cache_key})
        data = cached_record.scalar()

        if data is None:
            x = int(x)
            y = int(y)
            z = int(z)
            minx, miny, maxx, maxy = mercantile.xy_bounds(x, y, z)
            bind_params = {
                'minx': minx,
                'miny': miny,
                'maxx': maxx,
                'maxy': maxy,
            }
            result = dbsession.execute(statement, params=bind_params)
            data = result.fetchone()[0]
            data = data.tobytes()
            dbsession.execute(MVTCache.__table__.insert().values(key=cache_key, data=data))
            mark_changed(dbsession)
            log.debug(f'Saved data for {cache_key} to cache')
        else:
            log.debug(f'Got data for {cache_key} from cache')

        return Response(body=data, charset=None, content_type='application/x-protobuf')

    return view

