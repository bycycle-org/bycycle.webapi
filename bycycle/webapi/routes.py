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

    if settings['mvt.base_layers.enabled']:
        # Mapbox Vector Tile base layer views for use in dev
        add_mvt_view(config, Street, properties=('id', 'name'))
        add_mvt_view(config, Intersection, properties=('id',))


def add_mvt_view(config, table, layer_name=None, **kwargs):
    if layer_name is None:
        if isinstance(table, str):
            layer_name = table
        elif hasattr(table, '__table__'):
            layer_name = table.__table__.name
        else:
            layer_name = table.name

    route_name = f'mvt.{layer_name}'
    route_path = fr'/tiles/{layer_name}/{{x:\d+}}/{{y:\d+}}/{{z:\d+}}'
    view = views.make_mvt_view(table, layer_name=layer_name, **kwargs)
    config.add_route(route_name, route_path)
    config.add_view(route_name=route_name, view=view)
