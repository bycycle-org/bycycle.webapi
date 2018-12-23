from cornice import resource

from pyramid.config import Configurator

from bycycle.core.model import Intersection, Street

from . import views


def includeme(config: Configurator):
    settings = config.get_settings()

    config.add_route('home', '/')
    config.add_view(route_name='home', renderer='home.mako')

    config.add_cornice_resource(
        resource.add_resource(views.InfoResource, name='info', path='/info'))

    config.add_cornice_resource(
        resource.add_resource(views.QueryResource, name='query', path='/query'))

    config.add_cornice_resource(
        resource.add_resource(views.LookupResource, name='lookup', path='/lookup'))

    config.add_cornice_resource(
        resource.add_resource(views.DirectionsResource, name='directions', path='/directions'))

    if settings['mvt.enabled']:
        # Mapbox Vector Tile views
        add_mvt_view(config, Intersection)
        add_mvt_view(config, Street)


def add_mvt_view(config, type_):
    name = type_.__table__.name
    route_name = f'mvt.{name}'
    config.add_route(route_name, fr'/tiles/{name}/{{x:\d+}}/{{y:\d+}}/{{z:\d+}}')
    config.add_view(route_name=route_name, view=views.make_mvt_view(type_))
