from pyramid.paster import get_app, setup_logging

settings_file = '{{ remote_settings_file }}'
setup_logging(settings_file)
application = get_app(settings_file, 'main')
application.registry.settings['version'] = '{{ version }}'
