import paste.deploy
from bycycle.core import model


def setup_config(command, filename, section, vars):
    """Set up the application."""
    print '== Setting up byCycle Trip Planner Web application...'
    # Get configuration
    conf = paste.deploy.appconfig('config:' + filename)
    app_conf = conf.local_conf
    paste.deploy.CONFIG.push_process_config({
        'app_conf': app_conf,
        'global_conf': conf.global_conf
    })
    print '== Done setting up byCycle Trip Planner Web application.'
