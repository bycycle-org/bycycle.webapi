from pyramid.config import Configurator

from . import views


def includeme(config: Configurator):
    config.add_route('home', '/')
    config.add_route('info', '/info')
    config.add_route('search', '/search')
    config.add_route('lookup', '/lookup')
    config.add_route('directions', '/directions')

    config.add_notfound_view(views.notfound_view, renderer='/error.mako')

    config.add_view(
        views.ServiceView, attr='get', route_name='home', request_method='GET',
        renderer='/home.mako')

    config.add_view(
        views.ServiceView, attr='get', route_name='search', request_method='GET',
        renderer='json')

    config.add_view(
        views.InfoView, attr='get', route_name='info', request_method='GET',
        renderer='json')

    config.add_view(
        views.LookupView, attr='get', route_name='lookup', request_method='GET',
        renderer='json')

    config.add_view(
        views.DirectionsView, attr='get', route_name='directions', request_method='GET',
        renderer='json')
