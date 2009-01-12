import os

from pylons import config

from mako.lookup import TemplateLookup

from bycycle.tripplanner.config.routing import make_map

from bycycle.tripplanner.lib.app_globals import Globals
import bycycle.tripplanner.lib.helpers
from bycycle.tripplanner.config.routing import make_map


def load_environment(global_conf, app_conf):
    """Configure the Pylons environment via the ``pylons.config`` object."""
    # Pylons paths
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    paths = dict(root=root,
                 controllers=os.path.join(root, 'controllers'),
                 static_files=os.path.join(root, 'public'),
                 templates=[os.path.join(root, 'templates')])

    # Initialize config with the basic options
    config.init_app(
        global_conf, app_conf, package='bycycle.tripplanner', paths=paths)

    # The following template options are passed to your template engines
    config['routes.map'] = make_map()
    config['pylons.app_globals'] = Globals()
    config['pylons.h'] = bycycle.tripplanner.lib.helpers

    # Create the Mako TemplateLookup, with the default auto-escaping
    config['pylons.app_globals'].mako_lookup = TemplateLookup(
        directories=paths['templates'],
        module_directory=os.path.join(app_conf['cache_dir'], 'templates'),
        input_encoding='utf-8', output_encoding='utf-8',
        imports=['from webhelpers.html import escape'],
        default_filters=['escape'])

    # CONFIGURATION OPTIONS HERE (note: all config options will override
    # any Pylons config options)
