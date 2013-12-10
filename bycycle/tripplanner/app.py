from functools import partial

from pyramid.config import Configurator
from pyramid.events import BeforeRender
from pyramid.mako_templating import renderer_factory as mako_renderer_factory
from pyramid.renderers import JSON
from pyramid.settings import asbool

import sqlalchemy.orm

from zope.sqlalchemy import ZopeTransactionExtension

from bycycle.core.model import engine

from bycycle.tripplanner import helpers


def main(global_config, **settings):
    config = Configurator(settings=settings)
    config.add_route
    config.include(add_renderers)
    config.include(add_routes)
    config.include(add_views)
    config.include(add_static_views)
    config.include(add_subscribers)
    config.add_request_method(helpers.javascript_include_tag)
    config.add_request_method(helpers.stylesheet_link_tag)
    init_db(config)
    return config.make_wsgi_app()


def add_renderers(config):
    # HACK: The following line is temporary until I get around to
    # renaming the template files with .mako extensions.
    config.add_renderer('.html', mako_renderer_factory)

    def adapter(obj, request):
        if hasattr(obj, 'to_simple_object'):
            return obj.to_simple_object()
        raise TypeError

    json_renderer = JSON()
    json_renderer.add_adapter(object, adapter)
    config.add_renderer('json', json_renderer)


def add_routes(config):
    # These URLs return HTML only
    config.add_route('home', '')
    config.add_route('regions', '/regions')
    config.add_route('region', '/regions/{id}')
    config.add_route('geocodes', '/regions/{id}/geocodes')
    config.add_route('routes', '/regions/{id}/routes')

    # These URLs may return HTML or JSON
    renderer_pattern = '{renderer:(\.[a-z]+)?}'
    config.add_route(
        'find_geocode', '/regions/{id}/geocodes/find' + renderer_pattern)
    config.add_route(
        'find_route', '/regions/{id}/routes/find' + renderer_pattern)


def add_views(config):
    add = partial(config.add_view, '.views.regions.RegionsView')
    add(route_name='home', attr='index', renderer='/regions/index.html')
    add(route_name='regions', attr='index', renderer='/regions/index.html')
    add(route_name='region', attr='show', renderer='/regions/show.html')

    add = partial(config.add_view, '.views.geocode.GeocodeView')
    add(route_name='geocodes', attr='show', renderer='/regions/show.html')
    add(route_name='find_geocode', attr='find')

    add = partial(config.add_view, '.views.route.RouteView')
    add(route_name='routes', attr='show', renderer='/regions/show.html')
    add(route_name='find_route', attr='find')


def add_static_views(config):
    settings = config.get_settings()
    if settings.get('static_url'):
        static_url = settings['static_url']
        config.add_static_view(static_url, 'bycycle.tripplanner:static/')
    else:
        config.add_static_view('static', 'bycycle.tripplanner:static/')


def add_subscribers(config):
    settings = config.get_settings()
    renderer_globals = {
        'debug': settings['debug'],
        'h': helpers,
    }

    def factory(data):
        request = data['request']
        data.update(renderer_globals)
        data['wrap'] = asbool(request.params.get('wrap', True))
        return data

    config.add_subscriber(factory, BeforeRender)


def init_db(config):
    registry = config.registry
    factory = sqlalchemy.orm.sessionmaker(
        bind=engine,
        extension=ZopeTransactionExtension())
    registry['db.engine'] = engine
    registry['db.session_factory'] = factory
    db_session = lambda request: request.registry['db.session_factory']()
    config.add_request_method(db_session, name='db_session', reify=True)
