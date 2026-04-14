import logging
from textwrap import dedent

import mercantile

from pyramid.response import Response

from zope.sqlalchemy import mark_changed

from bycycle.core.geometry import WEB_SRID
from bycycle.core.geometry.sqltypes import Geometry
from bycycle.core.model import MVTCache, Street


log = logging.getLogger(__name__)


MVT_STATEMENT = """
    SELECT
      ST_AsMVT(q, '{layer_name}', NULL, '{column}')
    FROM (
      SELECT
        {properties},
        ST_AsMVTGeom(
          ST_Transform("{column}", {web_srid}),
          ST_MakeBox2D(ST_Point(:minx, :miny), ST_Point(:maxx, :maxy))
        ) AS geom
      FROM
        {table}
      WHERE
        ST_Intersects(
          ST_Transform("{column}", {web_srid}),
          ST_MakeEnvelope(:minx, :miny, :maxx, :maxy, {web_srid})
        )
        {where_clause}
    ) AS q;
"""


MVT_CACHE_STATEMENT = f'SELECT "data" FROM "mvt_cache" WHERE "key" = :key'


def make_mvt_view(table, layer_name=None, column=None, properties=None, where_clause=None):
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
                    break

        properties = properties or tuple(c.name for c in table.columns if c.name != column)
        table = table.name

    layer_name = layer_name or table
    column = column or 'geom'

    base_cache_key = ','.join(
        (layer_name, column, '-'.join(properties), where_clause or ''))

    properties = ', '.join('"%s"' % name for name in properties)
    where_clause = f'AND {where_clause}' if where_clause else ''
    web_srid = WEB_SRID
    statement = dedent(MVT_STATEMENT.strip().format_map(locals()))

    def view(request):
        dbsession = request.dbsession
        urlvars = request.matchdict

        x = urlvars['x']
        y = urlvars['y']
        z = urlvars['z']

        cache_key = ','.join((base_cache_key, x, y, z))
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


def street_bbox_view(request):
    dbsession = request.dbsession
    result = dbsession.execute(
        f"""SELECT ST_AsGeoJSON(ST_Extent(geom)) AS bbox FROM {Street.__table__.name}""")
    row = result.fetchone()
    return Response(row.bbox.encode('utf-8'), content_type='application/json')
