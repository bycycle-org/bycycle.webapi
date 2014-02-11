from tangled.converters import as_bool
from tangled.web.app import Application


def make_app(settings, parse_settings=False, **extra_settings):
    app = Application(settings, parse_settings, **extra_settings)
    app.include(mount_resources)
    app.include(mount_static_directories)
    app.include(add_subscribers)
    app.include('bycycle.tripplanner.helpers')
    app.scan('.resources')
    return app


def mount_resources(app):
    # These URLs return HTML only
    app.mount_resource('home', '.resources.service:ServiceResource', '/')
    app.mount_resource(
        'find', '.resources.service:ServiceResource', '/find',
        method_name='find')
    app.mount_resource(
        'find_geocode', '.resources.geocode:Geocode', '/geocode/find',
        method_name='find')
    app.mount_resource(
        'find_route', '.resources.route:Route', '/route/find',
        method_name='find')


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
        if 'wrap' not in context:
            context['wrap'] = as_bool(request.params.get('wrap', True))

    app.add_subscriber(
        'tangled.web.events:TemplateContextCreated', update_context)


def json_default(o):
    if hasattr(o, 'to_simple_object'):
        return o.to_simple_object()
    raise TypeError('{!r} is not JSON serializable'.format(o))
