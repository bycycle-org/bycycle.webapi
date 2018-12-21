import os
import posixpath
import shutil
import tarfile

from runcommands import command
from runcommands.commands import copy_file, local, remote, sync
from runcommands.util import printer

from bycycle.core.commands import *


# Provisioning ---------------------------------------------------------


@command
def provision(packages, deploy_user, deploy_root, set_timezone=True, upgrade_=True, install=True,
              create_user=True, create_site_dir=True, make_dhparams_=True, make_cert_=True):
    if set_timezone:
        remote('timedatectl set-timezone America/Los_Angeles', sudo=True)

    if upgrade_:
        upgrade(dist_upgrade=True, reboot=False)

    if install:
        remote((
            'apt --yes install software-properties-common &&',
            'add-apt-repository --yes ppa:certbot/certbot',
        ), sudo=True)
        remote((
            'apt --yes update &&',
            'apt --yes install', packages,
        ), sudo=True)

    if create_user:
        remote((
            'id -u', deploy_user, '||',
            'adduser --disabled-password --gecos', deploy_user, deploy_user,
        ), stdout='hide', sudo=True)

    if create_site_dir:
        remote((
            'mkdir -p /sites &&',
            'chgrp www-data /sites &&',
            'mkdir -p', deploy_root, '&&',
            'chown {deploy_user}:www-data'.format_map(locals()), deploy_root, '&&',
            'chmod -R u=rwX,g=rX,o=rX', deploy_root,
        ), sudo=True)

    if make_dhparams_:
        make_dhparams()

    if make_cert_:
        make_cert()


@command
def upgrade(dist_upgrade=False, reboot=True):
    remote((
        'apt --yes update &&',
        'apt --yes upgrade &&',
        'apt --yes dist-upgrade &&' if dist_upgrade else None,
        'apt --yes autoremove &&',
        'apt --yes autoclean',
    ), sudo=True)

    result = remote('test -f /var/run/reboot-required', sudo=True, raise_on_error=False)
    if result.succeeded:
        if reboot:
            printer.warning('Rebooting due to upgrade...')
            remote('reboot', sudo=True, raise_on_error=False)
        else:
            printer.warning('Reboot required due to upgrade')


@command
def make_dhparams(domain_name):
    remote('mkdir -p /etc/pki/nginx', sudo=True)
    remote((
        'test -f /etc/pki/nginx/{domain_name}.pem ||'.format_map(locals()),
        'openssl dhparam -out /etc/pki/nginx/{domain_name}.pem 2048'.format_map(locals()),
    ), sudo=True)


@command
def make_cert(domain_name, email='letsencrypt@{domain_name}'):
    """Create Let's encrypt certificate."""
    email = email.format(domain_name=domain_name)
    nginx('stop', raise_on_error=False)
    remote((
        'certbot',
        'certonly',
        '--agree-tos',
        '--standalone',
        '--domain', domain_name,
        '--email', email,
    ), sudo=True)
    nginx('start')


# Deployment -----------------------------------------------------------


@command
def deploy(package,
           version,
           settings_file,
           root,
           dir_,
           user,
           host,
           db,
           # Local
           build_dir='build',
           clean=False,
           sdists=(),
           # Remote
           overwrite=False,
           install=True,
           pip_find_links=None,
           pip_cache_dir=None,
           push=True,
           link=True,
           reload=True):

    # Local ----------------------------------------------------------

    if clean and os.path.exists(build_dir):
        shutil.rmtree(build_dir)

    os.makedirs(build_dir, exist_ok=True)

    # Add config files
    copy_file('application.wsgi', build_dir, template=True, context=locals())
    copy_file(settings_file, build_dir, template=True, context=locals())
    copy_file('commands.py', build_dir)
    copy_file('commands.yaml', build_dir)

    # Create source distributions
    dist_dir = os.path.abspath(os.path.join(build_dir, 'dist'))
    sdist_command = ('python', 'setup.py', 'sdist', '--dist-dir', dist_dir)
    local(sdist_command, stdout='hide')
    for path in sdists:
        local(sdist_command, stdout='hide', cd=path)

    tarball_name = '{version}.tar.gz'.format_map(locals())
    tarball_path = os.path.join(build_dir, tarball_name)
    with tarfile.open(tarball_path, 'w:gz') as tarball:
        tarball.add(build_dir, version)

    if push:
        sync(tarball_path, root, host, run_as=user)

    # Remote ----------------------------------------------------------

    deploy_dir_exists = remote(('test -d', dir_), raise_on_error=False)

    if deploy_dir_exists and overwrite:
        remote(('rm -r', dir_))

    remote(('tar -xvzf', tarball_name), cd=root)

    # Create virtualenv for this version
    venv_dir = posixpath.join(dir_, 'venv')
    venv_exists = remote(('test -d', venv_dir), raise_on_error=False)
    pip = posixpath.join(venv_dir, 'bin/pip')
    pip_cache_dir = posixpath.join(root, 'pip/cache')

    if venv_exists and overwrite:
        remote(('rm -r', venv_dir))
        venv_exists = False

    if not venv_exists:
        remote((
            'python3 -m venv', venv_dir, '&&',
            pip, 'install',
            '--cache-dir', pip_cache_dir,
            '--upgrade setuptools pip wheel',
        ))

    # Build source
    if install:
        remote((
            pip, 'install',
            '--find-links', posixpath.join(dir_, 'dist'),
            '--cache-dir', pip_cache_dir,
            '--disable-pip-version-check',
            package,
        ), cd=root)

    # Make this version the current version
    if link:
        remote(('ln -sfn', dir_, posixpath.join(root, 'current')))

    # Set permissions
    remote(('chmod -R ug=rwX,o=', root))

    if reload:
        uwsgi('reload')


# Services --------------------------------------------------------


@command
def nginx(command, raise_on_error=True):
    remote(('systemctl', command, 'nginx.service'), sudo=True, raise_on_error=raise_on_error)


@command
def push_nginx_config(host):
    sync('etc/nginx/', '/etc/nginx/', host, sudo=True, mode='u=rw,g=r,o=r')


@command
def uwsgi(command, raise_on_error=True):
    remote(('systemctl', command, 'uwsgi.service'), sudo=True, raise_on_error=raise_on_error)


@command
def push_uwsgi_config(host, config_file, config_link, enable=True):
    """Push uWSGI app config."""
    sync(config_file.lstrip('/'), config_file, host, sudo=True, mode='u=rw,g=r,o=r')
    if enable:
        remote(('ln -sf', config_file, config_link), sudo=True)


# Local -----------------------------------------------------------


@command
def dev_server(settings_file):
    local(('pserve', '--reload', settings_file), shell=True)
