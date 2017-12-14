from tangled.util import load_object

FACTORY = load_object('tangled.web:Application')
SETTINGS_FILE = '{deploy.dir}/{env}.ini'
EXTRA_SETTINGS = {{
    'version': '{version}',
}}

application = FACTORY(SETTINGS_FILE, **EXTRA_SETTINGS)
