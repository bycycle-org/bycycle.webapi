from tangled.converters import as_bool
from tangled.web.app import Application


def make_app(settings):
    app = Application(settings)
    app.include(mount_resources)
    app.include(mount_static_directories)
    app.include(add_subscribers)
    app.include('bycycle.tripplanner.helpers')
    app.scan('.resources')
    return app


def mount_resources(app):
    # These URLs return HTML only
    app.mount_resource('home', '.resources.regions:Regions', '/')
    app.mount_resource('regions', '.resources.regions:Regions', '/regions')
    app.mount_resource('region', '.resources.regions:Region', '/regions/<id>')
    app.mount_resource(
        'geocodes', '.resources.geocode:Geocode', '/regions/<id>/geocodes')
    app.mount_resource(
        'routes', '.resources.route:Route', '/regions/<id>/routes')

    # These URLs may return HTML or JSON
    renderer_pattern = '<renderer:(\.[a-z]+)?>'
    app.mount_resource(
        'find_geocode', '.resources.geocode:Geocode',
        '/regions/<id>/geocodes/find' + renderer_pattern, method_name='find')
    app.mount_resource(
        'find_route', '.resources.route:Route',
        '/regions/<id>/routes/find' + renderer_pattern, method_name='find')


def mount_static_directories(app):
    static_url = app.get_setting('static_url', None)
    if static_url:
        app.mount_static_directory('static', static_url)
    else:
        app.mount_static_directory('static', 'bycycle.tripplanner:static')


def add_subscribers(app):

    def update_context(event):
        context = event.context
        request = context['request']
        context['debug'] = event.app.debug
        context['h'] = request.helpers
        context['wrap'] = as_bool(request.params.get('wrap', True))

    app.add_subscriber(
        'tangled.web.events:TemplateContextCreated', update_context)
