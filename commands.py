import os
import shutil
import tarfile

from runcommands import command, commands
from runcommands.commands import show_config
from runcommands.util import abort, asset_path, printer

from bycycle.core.commands import *


@command(env=True)
def deploy(config, version=None, overwrite=False, overwrite_venv=False, install=True, static=True,
           push=True, link=True, restart=False):

    # Setup ----------------------------------------------------------

    if version:
        config = config._clone(version=version)
    elif config.get('version'):
        printer.info('Using default version:', config.version)
    else:
        abort(1, 'Version must be specified via config or passed as an option')

    # Local ----------------------------------------------------------

    if overwrite and os.path.exists(config.build.dir):
        shutil.rmtree(config.build.dir)

    os.makedirs(config.build.dir, exist_ok=True)

    def copy(source, destination=config.build.dir, template=False):
        source = source.format_map(config)
        destination = destination.format_map(config)
        if os.path.isdir(destination):
            destination = os.path.join(destination, os.path.basename(source))
        with open(source) as source:
            contents = source.read()
        if template:
            contents = contents.format_map(config)
        with open(destination, 'w') as destination:
            destination.write(contents)

    # Add config files
    copy('application.wsgi', template=True)
    copy('base.ini')
    copy('{env}.ini', template=True)
    copy('commands.py')
    copy('commands.cfg')

    # Create source distributions
    dist_dir = os.path.abspath(config.build.dist_dir)
    sdist_command = f'python setup.py sdist --dist-dir {dist_dir}'
    commands.local(config, sdist_command, hide='stdout')
    commands.local(config, sdist_command, hide='stdout', cd='../bycycle.core')

    # Collect static files
    if static:
        build_static(config)

    tarball_name = f'{config.version}.tar.gz'
    tarball_path = os.path.join(config.build.dir, tarball_name)
    with tarfile.open(tarball_path, 'w:gz') as tarball:
        tarball.add(config.build.dir, config.version)

    if push:
        commands.local(config, (
            'rsync -rltvz',
            '--rsync-path "sudo -u {remote.user} rsync"',
            tarball_path, '{remote.host}:{deploy.root}',
        ))

    # Remote ----------------------------------------------------------

    deploy_dir_exists = commands.remote(config, 'test -d {deploy.dir}', abort_on_failure=False)

    if deploy_dir_exists and overwrite:
        commands.remote(config, 'rm -r {deploy.dir}')

    commands.remote(config, ('tar -xvzf', tarball_name), cd='{deploy.root}')

    # Create virtualenv for this version
    venv_exists = commands.remote(config, 'test -d {deploy.venv}', abort_on_failure=False)

    if venv_exists and overwrite_venv:
        commands.remote(config, 'rm -r {deploy.venv}')
        venv_exists = False

    if not venv_exists:
        commands.remote(config, (
            '/usr/local/bin/virtualenv',
            '-p /usr/local/bin/python{python.version}',
            '{deploy.venv}',
        ))
        commands.remote(config, '{deploy.pip.exe} install --upgrade pip')

    # Build source
    if install:
        commands.remote(config, (
            '{deploy.pip.exe}',
            'install',
            '--find-links {deploy.pip.find_links}',
            '--cache-dir {deploy.pip.cache_dir}',
            '--disable-pip-version-check',
            'bycycle.tripplanner',
        ))

    if static:
        push_static(config, build=False)

    # Make this version the current version
    if link:
        commands.remote(config, 'ln -sfn {deploy.dir} {deploy.link}')

    # Set permissions
    commands.remote(config, 'chmod -R ug=rwX,o= {deploy.root}')

    if restart:
        restart_uwsgi_app(config)


@command(env=True)
def push_uwsgi_config(config):
    """Push uWSGI Upstart config.
    
    This usually shouldn't be necessary.
    
    """
    commands.local(config, (
        'rsync -rltvz',
        '--rsync-path "sudo rsync"',
        'etc/init/uwsgi.conf', '{remote.host}:/etc/init',
    ))


@command(env=True)
def restart_uwsgi(config):
    """Restart uWSGI system process.
    
    This usually shouldn't be necessary.
    
    """
    commands.remote(config, 'restart uwsgi', sudo=True)


@command(env=True)
def push_uwsgi_app_config(config, restart=False):
    """Push uWSGI app config."""
    commands.local(config, (
        'rsync -rltvz',
        '--rsync-path "sudo -u {remote.user} rsync"',
        'etc/uwsgi/bycycle.ini', '{remote.host}:{deploy.root}',
    ))
    if restart:
        restart_uwsgi_app(config)


@command(env=True)
def restart_uwsgi_app(config):
    """Restart uWSGI app process.
    
    The uWSGI app process needs to be restarted after deploying a new
    version (or installing a new uWSGI app config).
    
    """
    commands.remote(config, '/usr/local/bin/uwsgi --reload {deploy.root}/uwsgi.pid')


@command
def build_static(config):
    build_dir = config.build.static_dir

    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)
    os.makedirs(build_dir)

    static_path = asset_path('bycycle.tripplanner:static')
    css_path = os.path.join(static_path, 'css')
    js_path = os.path.join(static_path, 'js')

    commands.local(config, ('rsync -rltvz', static_path + '/', build_dir))

    # CSS
    css_in = os.path.join(css_path, 'base.css')
    css_out = os.path.join(build_dir, 'css/app.css')
    css_out_min = os.path.join(build_dir, 'css/app.min.css')
    commands.local(config, f'r.js -o cssIn={css_in} out={css_out}')
    commands.local(config, f'r.js -o cssIn={css_in} out={css_out_min} optimizeCss=standard')

    # JS
    base_url = os.path.join(js_path, 'vendor')
    js_in = os.path.join(js_path, 'main.js')
    js_out = os.path.join(build_dir, 'js/app.js')
    js_out_min = os.path.join(build_dir, 'js/app.min.js')

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


@command(env=True)
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


# Front End -----------------------------------------------------------


FRONT_END_COMMAND_ARGS = {
    'env': True,
    'config': {
        'remote.host': 'aws.bycycle.org',
        'defaults.runcommands.runners.commands.remote.host': 'aws.bycycle.org',
        'defaults.runcommands.runners.commands.remote.sudo': True,
    },
}


@command(**FRONT_END_COMMAND_ARGS)
def push_nginx_config(config):
    commands.local(config, (
        'rsync -rltvz',
        '--rsync-path "sudo rsync"',
        'etc/nginx/', '{remote.host}:/etc/nginx',
    ))


@command(**FRONT_END_COMMAND_ARGS)
def restart_nginx(config):
    commands.remote(config, 'service nginx restart')


@command(**FRONT_END_COMMAND_ARGS)
def install_certbot(config):
    """Install Let's Encrypt client."""
    commands.remote(config, (
        'curl -O https://dl.eff.org/certbot-auto &&',
        'chmod +x certbot-auto',
    ), cd='/usr/local/bin')


@command(**FRONT_END_COMMAND_ARGS)
def make_cert(config, domain_name='bycycle.org', email='letsencrypt@bycycle.org'):
    """Create Let's encrypt certificate."""
    commands.remote(config, 'service nginx stop')
    commands.remote(config, (
        '/usr/local/bin/certbot-auto --debug --non-interactive',
        'certonly --agree-tos --standalone',
        '--domain', domain_name,
        '--email', email,
    ))
    commands.remote(config, 'service nginx start')


@command(**FRONT_END_COMMAND_ARGS)
def make_dhparams(config, domain_name='bycycle.org'):
    commands.remote(config, 'mkdir -p /etc/pki/nginx')
    commands.remote(config, (
        f'test -f /etc/pki/nginx/{domain_name}.pem ||',
        f'openssl dhparam -out /etc/pki/nginx/{domain_name}.pem 2048',
    ), timeout=120)
