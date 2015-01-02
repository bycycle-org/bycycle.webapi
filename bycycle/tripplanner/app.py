import json

from shapely import wkb

from sqlalchemy.sql import func

from tangled.converters import as_bool
from tangled.web import Application, make_app_settings

from bycycle.core.model import Street


def make_app(settings, **extra_settings):
    settings = make_app_settings(
        settings,
        conversion_map={
            'assets.use_built': 'bool',
            'assets.css.use_built': 'bool',
            'assets.js.use_built': 'bool',
        },
        required=['assets.use_built'],
        **extra_settings
    )
    app = Application(settings)

    use_built = settings['assets.use_built']
    settings.setdefault('assets.css.use_built', use_built)
    settings.setdefault('assets.js.use_built', use_built)

    app.include(mount_resources)
    app.include(mount_static_directories)
    app.include(add_subscribers)
    app.include('bycycle.tripplanner.helpers')
    app.load_config('.resources')

    # Map config
    engine = app['sqlalchemy.engine']
    q = engine.execute(func.ST_Envelope(func.ST_Extent(Street.geom)))
    extent = q.scalar()
    extent = wkb.loads(extent, hex=True)
    map_settings =  {
        'bbox': extent.bounds,
        'boundary': list(extent.exterior.coords),
        'center': extent.centroid.coords[0],
    }
    app.settings['map'] = map_settings
    app.settings['map.json'] = json.dumps(map_settings)

    return app


def mount_resources(app):
    app.mount_resource('home', '.resources.service:ServiceResource', '/')
    app.mount_resource(
        'find', '.resources.service:ServiceResource', '/find',
        method_name='generic_find')

    app.mount_resource('lookup', '.resources.lookup:Lookup', '/lookup')
    app.mount_resource(
        'do_lookup', '.resources.lookup:Lookup', '/lookup/find',
        method_name='find')

    app.mount_resource('route', '.resources.route:Route', '/route')
    app.mount_resource(
        'find_route', '.resources.route:Route', '/route/find',
        method_name='find')


def mount_static_directories(app):
    static_url = app.get_setting('static_url', None)
    if static_url:
        static_url = static_url.format(version=app.settings['version'])
        app.mount_static_directory('static', static_url)
    else:
        app.mount_static_directory('static', 'bycycle.tripplanner:static')


def add_subscribers(app):

    def update_context(event):
        context = event.context
        request = context['request']
        context['debug'] = event.app.debug
        context['h'] = request.helpers
        if 'wrap' not in context:
            context['wrap'] = as_bool(request.params.get('wrap', True))

    app.add_subscriber(
        'tangled.web.events:TemplateContextCreated', update_context)
