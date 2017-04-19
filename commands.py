import os
import shutil

from runcommands import command, commands
from runcommands.commands import show_config
from runcommands.util import asset_path

from bycycle.core.commands import init, install


@command
def build_static(config):
    build_dir = config.build.static_dir

    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)
    os.makedirs(build_dir)

    static_path = asset_path('bycycle.tripplanner:static')
    css_path = os.path.join(static_path, 'css')
    js_path = os.path.join(static_path, 'js')

    # CSS
    css_in = os.path.join(css_path, 'base.css')
    css_out = os.path.join(build_dir, 'app.css')
    css_out_min = os.path.join(build_dir, 'app.min.css')
    commands.local(config, f'r.js -o cssIn={css_in} out={css_out}')
    commands.local(config, f'r.js -o cssIn={css_in} out={css_out_min} optimizeCss=standard')

    # JS
    base_url = os.path.join(js_path, 'vendor')
    js_in = os.path.join(js_path, 'main.js')
    js_out = os.path.join(build_dir, 'app.js')
    js_out_min = os.path.join(build_dir, 'app.min.js')

    commands.local(config, (
        'r.js -o',
        f'mainConfigFile={js_in}',
        f'baseUrl={base_url}',
        'name=../main',
        'include=almond',
        'optimize=none',
        f'out={js_out}',
    ))

    commands.local(config, f'{config.venv.python} -m rjsmin <{js_out} >{js_out_min}')


@command
def push_static(config, build=True, dry_run=False):
    """Copy static files to S3 bucket."""
    if build:
        build_static(config)

    source = config.build.static_dir
    destination = config.deploy.static_dir

    commands.local(config, (
        'aws s3 sync',
        '--acl public-read',
        '--dryrun' if dry_run else '',
        source, destination,
    ))
