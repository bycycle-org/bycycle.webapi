from pyramid.config import Configurator
from pyramid.settings import asbool


def main(global_config, **settings):
    settings['debug'] = asbool(settings.get('debug', False))
    settings['cors.enabled'] = asbool(settings.get('cors.enabled', False))
    settings['cors.permissive'] = asbool(settings.get('cors.permissive', False))
    settings['mvt.base_layers.enabled'] = asbool(settings.get('mvt.base_layers.enabled', False))
    with Configurator(settings=settings) as config:
        config.include('cornice')
        config.include('pyramid_mako')
        config.include('.cors')
        config.include('.model')
        config.include('.routes')
        config.scan('.views')
    return config.make_wsgi_app()
