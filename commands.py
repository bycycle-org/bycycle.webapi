import os
import posixpath
import shutil
import tarfile

from runcommands import command
from runcommands.commands import copy_file, local, remote, sync

from bycycle.core.commands import *


# Provisioning ---------------------------------------------------------


@command
def provision(packages, deploy_user, deploy_root, set_timezone=True, upgrade_=True, install=True,
              create_user=True, create_site_dir=True, make_dhparams_=True, make_cert_=True):
    if set_timezone:
        remote('timedatectl set-timezone America/Los_Angeles', sudo=True)

    if upgrade_:
        upgrade(dist_upgrade=True)

    if install:
        remote((
            'apt-get --yes install software-properties-common &&',
            'add-apt-repository --yes ppa:certbot/certbot',
        ), sudo=True)
        remote((
            'apt-get --yes update &&',
            'apt-get --yes install', packages,
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
            'chown {user}:www-data'.format(user=deploy_user), deploy_root, '&&',
            'chmod -R u=rwX,g=rX,o=rX', deploy_root,
        ), sudo=True)

    if make_dhparams_:
        make_dhparams()

    if make_cert_:
        make_cert()


@command
def upgrade(dist_upgrade=False):
    remote((
        'apt-get --yes update &&',
        'apt-get --yes upgrade &&',
        'apt-get --yes dist-upgrade &&' if dist_upgrade else None,
        'apt-get --yes autoremove &&',
        'apt-get --yes autoclean',
    ), sudo=True)

    remote((
        'test -f /var/run/reboot-required &&',
        'echo Rebooting due to upgrade... &&',
        'reboot',
    ), sudo=True, raise_on_error=False)


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

    if venv_exists and overwrite:
        remote(('rm -r', venv_dir))
        venv_exists = False

    if not venv_exists:
        remote((
            'python{python.version} -m venv', venv_dir, '&&',
            posixpath.join(venv_dir, 'bin/pip'),
            'install',
            '--cache-dir', posixpath.join(root, 'pip/cache'),
            '--upgrade setuptools pip wheel',
        ))

    # Build source
    if install:
        remote((
            'install',
            '--find-links', posixpath.join(dir_, 'dist'),
            '--cache-dir', posixpath.join(root, 'pip/cache'),
            '--disable-pip-version-check',
            package,
        ), cd=root)

    # Make this version the current version
    if link:
        remote(('ln -sfn', dir_, posixpath.join(root, 'current')))

    # Set permissions
    remote(('chmod -R ug=rwX,o=', root))

    if reload:
        reload_uwsgi()


# Services --------------------------------------------------------


@command
def nginx(command, raise_on_error=True):
    remote(('service nginx', command), sudo=True, raise_on_error=raise_on_error)


@command
def push_nginx_config(host):
    sync('etc/nginx/', '/etc/nginx/', host, sudo=True)


@command
def uwsgi(command, raise_on_error=True):
    remote(('service uwsgi', command), sudo=True, raise_on_error=raise_on_error)


@command
def push_uwsgi_config(host, config_file, config_link, enable=True):
    """Push uWSGI app config."""
    sync(config_file.lstrip('/'), config_file, host, sudo=True)
    if enable:
        remote(('ln -sf', config_file, config_link), sudo=True)


@command
def reload_uwsgi(pid_file):
    """Reload uWSGI app process.

    The uWSGI app process needs to be reloaded after deploying a new
    version.

    """
    remote(('/usr/bin/uwsgi --reload', pid_file))


# Local -----------------------------------------------------------


@command
def dev_server(settings_file):
    local(('pserve', '--reload', settings_file), shell=True)
