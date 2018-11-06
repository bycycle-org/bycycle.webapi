from pyramid.paster import get_app, setup_logging

settings_file = '{settings_file}'
setup_logging(settings_file)
application = get_app(settings_file, 'main')
application.registry.settings['version'] = '{version}'
