import os
from pathlib import Path

from runcommands import command
from runcommands.commands import git_version, local, remote, sync
from runcommands.util import confirm, printer

from bycycle.core.commands import *


# Provisioning ---------------------------------------------------------


@command
def provision(env='production', tags=(), skip_tags=(), echo=True):
    if not tags:
        tags = 'provision'
    if isinstance(tags, str):
        tags = (tags,)
    args = get_ansible_args(env, tags=tags, skip_tags=skip_tags)
    printer.header(f'Provisioning {env}...')
    return local(args, echo=echo)


@command
def upgrade(env='production', echo=True):
    tags = ('provision-upgrade-packages', 'provision-apt-cleanup')
    provision(env=env, tags=tags, echo=echo)


# Deployment -----------------------------------------------------------


@command(timed=True)
def deploy(env,
           version=None,

           # Corresponding tags will be included unless unset *or* any
           # tags are specified via --tags.
           prepare: 'Run preparation tasks (local)' = True,
           dijkstar: 'Run Dijkstar tasks (remote)' = True,
           deploy: 'Run deployment tasks (remote)' = True,

           # Corresponding tags will be skipped unless set.
           clean: 'Remove local build directory' = False,
           overwrite: 'Remove remote build directory' = False,

           tags: 'Run *only* tasks corresponding to these tags' = (),
           skip_tags: 'Skip tasks corresponding to these tags' = (),

           yes: 'Deploy without confirmation' = False,
           echo=True):
    """Deploy the byCycle web API and, if requested, the UI.

    Typical usage::

        run deploy -c

    """
    version = version or git_version()
    tags = (tags,) if isinstance(tags, str) else tags
    skip_tags = (skip_tags,) if isinstance(skip_tags, str) else skip_tags
    yes = False if env == 'production' else yes

    if tags:
        prepare = 'prepare' in tags
        dijkstar = 'dijkstar' in tags
        deploy = 'deploy' in tags
    else:
        if prepare:
            tags += ('prepare',)
        if dijkstar:
            tags += ('dijkstar',)
        if deploy:
            tags += ('deploy',)

    if not clean:
        skip_tags += ('remove-build-directory',)
    if not overwrite:
        skip_tags += ('overwrite',)

    if not prepare:
        printer.info('Not preparing')
    if not dijkstar:
        printer.info('Not running Dijkstar tasks')
    if not deploy:
        printer.info('Not deploying')
    if tags:
        printer.info('Selected tags: %s' % ', '.join(tags))
    if skip_tags:
        printer.info('Skipping tags: %s' % ', '.join(skip_tags))
    if clean:
        printer.warning('Local build directory will be removed first')
    if overwrite:
        printer.warning('Remote build directory will be overwritten')

    environ = {}

    if not yes:
        message = f'Deploy version {version} to {env}?'
        confirm(message, abort_on_unconfirmed=True)

    printer.header(f'Deploying {version} to {env}...')
    ansible_args = get_ansible_args(env, version=version, tags=tags, skip_tags=skip_tags)
    return local(ansible_args, environ=environ, echo=echo)


# Ansible Utilities ----------------------------------------------------


def get_ansible_paths(env, *, root=None):
    root = root or Path.cwd()
    ansible_dir = root / 'ansible'
    return {
        'root': root,
        'ansible_dir': ansible_dir,
        'inventory': ansible_dir / env,
        'roles_path': ansible_dir / 'roles',
        'playbook': ansible_dir / 'site.yaml',
    }


def get_ansible_args(env, *, root=None, tags=(), skip_tags=(), version=None, extra_vars=None):
    paths = get_ansible_paths(env, root=root)
    extra_vars = extra_vars or {}
    if version:
        extra_vars['version'] = version
    tags = tuple(tag for tag in tags if tag not in skip_tags)
    return [
        'ansible-playbook',
        '--inventory', paths['inventory'],
        '--extra-var', 'root={root}'.format(root=paths['root']),
        '--extra-var', f'env={env}',
        [('--extra-var', f'{name}={value}') for name, value in extra_vars.items()],
        [('--tag', tag) for tag in tags],
        [('--skip-tag', tag) for tag in skip_tags],
        paths['playbook'],
    ]


# Services -------------------------------------------------------------


@command
def nginx(cmd, raise_on_error=True):
    remote(('systemctl', cmd, 'nginx.service'), sudo=True, raise_on_error=raise_on_error)


@command
def push_nginx_config(host):
    sync('ansible/roles/provision/files/etc/nginx/', '/etc/nginx/', host, sudo=True,
         mode='u=rw,g=r,o=r')


@command
def uwsgi(command, raise_on_error=True):
    remote(('systemctl', command, 'uwsgi.service'), sudo=True, raise_on_error=raise_on_error)


@command
def push_uwsgi_config(host):
    """Push uWSGI app config."""
    path = 'etc/uwsgi/apps-enabled/bycycle.org.ini'
    local_path = os.path.join('ansible/roles/provision/files', path)
    remote_path = os.path.join('/', path)
    sync(local_path, remote_path, host, sudo=True, mode='u=rw,g=r,o=r')


@command
def dijkstar(cmd):
    remote(('systemctl', cmd, 'dijkstar.service'), sudo=True)


# Data-loading ---------------------------------------------------------


@command
def remote_load_osm_data(fetch=True):
    remote((
        'pwd',
        './venv/bin/run',
        '-e', 'production',
        'fetch-osm-data' if fetch else None,
        'load-osm-data',
    ), cd='~/current')
    # remote_reload_graph()


@command
def remote_create_graph():
    remote('./venv/bin/run -e production create-graph', cd='~/current')
    remote_reload_graph()


@command
def remote_reload_graph(restart=False):
    if restart:
        dijkstar('restart')
    else:
        # XXX: Only works if `dijkstar serve --workers=1`; if workers is
        #      greater than 1, run `dikstar('restart')` command instead.
        remote('curl -X POST "http://localhost:8000/reload-graph"')


# Local ----------------------------------------------------------------


@command
def dev_server(settings_file):
    local(('pserve', '--reload', settings_file), shell=True)
