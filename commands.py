import os
import shutil
import tarfile

from runcommands import command
from runcommands.commands import copy_file, local, remote, show_config
from runcommands.util import abort, asset_path, printer

from bycycle.core.commands import *


# Provisioning ---------------------------------------------------------


PROVISIONING_CONFIG = {
    'defaults.runcommands.runners.commands.remote.run_as': None,
    'defaults.runcommands.runners.commands.remote.sudo': True,
    'defaults.runcommands.runners.commands.remote.timeout': 120,
}


@command(env=True, config=PROVISIONING_CONFIG)
def provision(config, packages=(), set_timezone=True, upgrade=True, install=True,
              create_user=True, create_site_dir=True, make_dhparams=True, make_cert=True):
    commands = config.run.commands

    if set_timezone:
        remote(config, (
            'echo "America/Los_Angeles" > /etc/timezone &&',
            'dpkg-reconfigure -f noninteractive tzdata',
        ))

    if upgrade:
        commands['upgrade'](config, dist_upgrade=True)

    if install:
        remote(config, (
            'apt-get --yes install software-properties-common &&',
            'add-apt-repository --yes ppa:certbot/certbot',
        ))
        remote(config, (
            'apt-get --yes update &&',
            'apt-get --yes install', packages,
        ))

    if create_user:
        remote(config, (
            'id -u bycycle ||',
            'adduser --disabled-password --gecos byCycle bycycle',
        ), use_pty=False)

    if create_site_dir:
        remote(config, (
            'mkdir -p /sites &&',
            'chgrp www-data /sites &&',
            'mkdir -p /sites/bycycle &&',
            'chown bycycle:www-data /sites/bycycle &&',
            'chmod -R u=rwX,g=rX,o=rX /sites/bycycle'
        ))

    if make_dhparams:
        commands['make-dhparams'](config)

    if make_cert:
        commands['make-cert'](config)


@command(env=True, config=PROVISIONING_CONFIG)
def upgrade(config, dist_upgrade=False):
    remote(config, (
        'apt-get --yes update &&',
        'apt-get --yes upgrade &&',
        'apt-get --yes dist-upgrade &&' if dist_upgrade else '',
        'apt-get --yes autoremove &&',
        'apt-get --yes autoclean',
    ))


@command(env=True, config=PROVISIONING_CONFIG)
def make_dhparams(config, domain_name='bycycle.org'):
    remote(config, 'mkdir -p /etc/pki/nginx', sudo=True)
    remote(config, (
        'test -f /etc/pki/nginx/{domain_name}.pem ||'.format_map(locals()),
        'openssl dhparam -out /etc/pki/nginx/{domain_name}.pem 2048'.format_map(locals()),
    ))


@command(env=True, config=PROVISIONING_CONFIG)
def make_cert(config, domain='bycycle.org', email='letsencrypt@bycycle.org'):
    """Create Let's encrypt certificate."""
    nginx(config, 'stop', abort_on_failure=False)
    remote(config, (
        'certbot',
        'certonly',
        '--agree-tos',
        '--standalone',
        '--domain', domain,
        '--email', email,
    ))
    nginx(config, 'start')


# Deployment -----------------------------------------------------------


@command(env=True)
def deploy(config, version=None, overwrite=False, overwrite_venv=False, install=True, static=True,
           push=True, link=True, restart=True):

    # Setup ----------------------------------------------------------

    if version:
        config = config.copy(version=version)
    elif config.get('version'):
        printer.info('Using default version:', config.version)
    else:
        abort(1, 'Version must be specified via config or passed as an option')

    # Local ----------------------------------------------------------

    build_dir = config.build.dir

    if overwrite and os.path.exists(build_dir):
        shutil.rmtree(build_dir)

    os.makedirs(build_dir, exist_ok=True)

    # Add config files
    copy_file(config, 'application.wsgi', build_dir, template=True)
    copy_file(config, 'base.ini', build_dir)
    copy_file(config, '{env}.ini', build_dir, template=True)
    copy_file(config, 'commands.py', build_dir)
    copy_file(config, 'commands.cfg', build_dir)

    # Create source distributions
    dist_dir = os.path.abspath(config.build.dist_dir)
    sdist_command = ('python setup.py sdist --dist-dir', dist_dir)
    local(config, sdist_command, hide='stdout')
    local(config, sdist_command, hide='stdout', cd='../bycycle.core')

    # Collect static files
    if static:
        build_static(config)

    tarball_name = '{config.version}.tar.gz'.format(config=config)
    tarball_path = os.path.join(build_dir, tarball_name)
    with tarfile.open(tarball_path, 'w:gz') as tarball:
        tarball.add(build_dir, config.version)

    if push:
        local(config, (
            'rsync -rltvz',
            '--rsync-path "sudo -u bycycle rsync"',
            tarball_path, '{remote.host}:{deploy.root}',
        ))

    # Remote ----------------------------------------------------------

    deploy_dir_exists = remote(config, 'test -d {deploy.dir}', abort_on_failure=False)

    if deploy_dir_exists and overwrite:
        remote(config, 'rm -r {deploy.dir}')

    remote(config, ('tar -xvzf', tarball_name), cd='{deploy.root}')

    # Create virtualenv for this version
    venv_exists = remote(config, 'test -d {deploy.venv}', abort_on_failure=False)

    if venv_exists and overwrite_venv:
        remote(config, 'rm -r {deploy.venv}')
        venv_exists = False

    if not venv_exists:
        remote(config, (
            'python{python.version} -m venv {deploy.venv} &&',
            '{deploy.bin}/python -m ensurepip &&',
            '{deploy.pip.exe} install --upgrade setuptools pip wheel'
        ))

    # Build source
    if install:
        remote(config, (
            '{deploy.pip.exe}',
            'install',
            '--find-links {deploy.pip.find_links}',
            '--cache-dir {deploy.pip.cache_dir}',
            '--disable-pip-version-check',
            'bycycle.tripplanner',
        ), cd='{deploy.root}', timeout=120)

    if static:
        push_static(config, build=False)

    # Make this version the current version
    if link:
        remote(config, 'ln -sfn {deploy.dir} {deploy.link}')

    # Set permissions
    remote(config, 'chmod -R ug=rwX,o= {deploy.root}')

    if restart:
        restart_uwsgi(config)


@command
def build_static(config):
    build_dir = config.build.static_dir

    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)
    os.makedirs(build_dir)

    static_path = asset_path('bycycle.tripplanner:static')
    css_path = os.path.join(static_path, 'css')
    js_path = os.path.join(static_path, 'js')

    local(config, ('rsync -rltvz', static_path + '/', build_dir))

    # CSS
    css_in = os.path.join(css_path, 'base.css')
    css_out = os.path.join(build_dir, 'css/app.css')
    css_out_min = os.path.join(build_dir, 'css/app.min.css')

    cmd = 'r.js -o cssIn={css_in} out={css_out}'.format_map(locals())
    local(config, cmd)

    cmd = 'r.js -o cssIn={css_in} out={css_out_min} optimizeCss=standard'.format_map(locals())
    local(config, cmd)

    # JS
    base_url = os.path.join(js_path, 'vendor')
    js_in = os.path.join(js_path, 'main.js')
    js_out = os.path.join(build_dir, 'js/app.js')
    js_out_min = os.path.join(build_dir, 'js/app.min.js')

    local(config, (
        'r.js -o',
        'mainConfigFile={js_in}'.format(js_in=js_in),
        'baseUrl={base_url}'.format(base_url=base_url),
        'name=../main',
        'include=almond',
        'optimize=none',
        'out={js_out}'.format(js_out=js_out),
    ))

    cmd = '{config.venv.python} -m rjsmin <{js_out} >{js_out_min}'.format_map(locals())
    local(config, cmd)


@command(env=True)
def push_static(config, build=True, dry_run=False):
    """Copy static files to S3 bucket."""
    if build:
        build_static(config)

    source = config.build.static_dir
    destination = config.deploy.static_dir

    local(config, (
        'aws s3 sync',
        '--acl public-read',
        '--dryrun' if dry_run else '',
        source, destination,
    ))


# Services --------------------------------------------------------


@command(env=True)
def push_nginx_config(config):
    local(config, (
        'rsync -rltvz',
        '--rsync-path "sudo rsync"',
        'etc/nginx/', '{remote.host}:/etc/nginx',
    ))


@command(env=True, config={
    'defaults.runcommands.runners.commands.remote.run_as': None,
    'defaults.runcommands.runners.commands.remote.sudo': True,
})
def nginx(config, command, abort_on_failure=True):
    remote(config, ('service nginx', command), abort_on_failure=abort_on_failure)


@command(env=True)
def push_uwsgi_config(config, restart=False):
    """Push uWSGI app config."""
    local(config, (
        'rsync -rltvz',
        '--rsync-path "sudo rsync"',
        'etc/uwsgi/apps-available/bycycle.ini', '{remote.host}:/etc/uwsgi/apps-available',
    ))
    if restart:
        restart_uwsgi(config)


@command(env=True)
def restart_uwsgi(config):
    """Restart uWSGI app process.

    The uWSGI app process needs to be restarted after deploying a new
    version (or installing a new uWSGI app config).

    """
    remote(config, '/usr/bin/uwsgi --reload /run/uwsgi/app/bycycle/pid')
