"""One-touch deployment. Run buildout first."""
import contextlib
import datetime
import glob
import os
import pprint
import shutil
import subprocess
import sys
import tarfile

from pkg_resources import find_distributions, resource_filename

from fabric.api import env, cd, run, put, task
from fabric.context_managers import path
from fabric.contrib.files import exists
from fabric.tasks import Task
from fabric.utils import abort


_find_dist = lambda: list(find_distributions('.', only=True))
if not _find_dist():
    subprocess.check_call(['buildout'])
app_dist = _find_dist()[0]

# These values pertain to the application package.
env.egg_name = app_dist.project_name
env.package = env.egg_name.split('.', 1)[1]
env.version = app_dist.version
env.release_timestamp = datetime.datetime.now()
env.source_path = app_dist.location
env.package_path = resource_filename(app_dist.project_name, '')
env.static_dir = os.path.join(env.package_path, 'static')

# These values pertain to the deployment server.
env.user = 'bycycle'
env.HOME = '/home/bycycle'
env.env_base_dir = '{0.HOME}/webapps/bycycle'.format(env)
env.static_server_base_dir = '{0.env_base_dir}/static'.format(env)
env.static_server_path = '{static_server_base_dir}/{version}'.format(**env)

# Map of environment names to host lists
env.roledefs = {
    'staging': ['localhost'],
    'production': ['bycycle.org'],
}


@task
def dump_env():
    pprint.pprint(env)


def setup_py(commands, python='./bin/python'):
    """Run setup.py command or commands."""
    cmd = [python, 'setup.py']
    if isinstance(commands, basestring):
        commands = commands.split()
    cmd += commands
    sys.stdout.write('[localhost] run: {0}\n'.format(' '.join(cmd)))
    with open(os.devnull, 'w') as devnull:
        subprocess.check_call(cmd, stdout=devnull, stderr=devnull)


def sdist(python='./bin/python', clean='yes', upload='no', upload_to='pypi',
          pre_commands='', dist_dir=None):
    """Create source distribution; optionally upload.

    ``clean`` build and dist directories by default.

    ``upload`` to package index?

    ``upload_to`` a particular package index server.

    ``pre_commands`` to be run BEFORE sdist. Will be injected as-is.

    """
    clean = (clean == 'yes')
    upload = (upload == 'yes')
    commands = []
    if pre_commands:
        commands += pre_commands.split()
    commands.append('sdist')
    if dist_dir is not None:
        commands.extend(('--dist-dir', dist_dir))
    if upload:
        commands += ['upload', '-r', upload_to]
    if clean:
        #shutil.rmtree('./build', ignore_errors=True)
        shutil.rmtree('{0}.egg-info'.format(env.egg_name), ignore_errors=True)
        dists = glob.glob('./dist/{0}*'.format(env.egg_name))
        for d in dists:
            os.remove(d)
    setup_py(commands, python=python)


class Deployer(Task):

    name = 'deploy'

    def run(self, env_base_dir=None, env_name=None, link_name=None, force='no',
            develop_eggs='', command=None):
        self.env_name = env_name or env.version
        self.tarball_name = '{0.env_name}.tar.gz'.format(self)

        # Local
        parent_dir = os.path.join('build', 'deploy')
        self.build_dir = os.path.join(parent_dir, self.env_name)
        self.build_paths = dict(
            config=os.path.join(self.build_dir, 'config'),
            dist=os.path.join(self.build_dir, 'dist'),
            static=os.path.join(self.build_dir, 'static'),
            tarball=os.path.join(parent_dir, self.tarball_name)
        )

        # Remote
        self.env_base_dir = env_base_dir or env.env_base_dir
        self.link_name = link_name or 'current'
        self.buildout_dir = '{0.env_base_dir}/buildout'.format(self)
        self.env_dir = '{0.env_base_dir}/{0.env_name}'.format(self)

        # Options
        self.force = (force == 'yes')
        self.develop_eggs = develop_eggs

        if command is not None:
            getattr(self, command)()
        else:
            self.deploy()

    def dump_env(self):
        pprint.pprint(env)

    def deploy(self):
        self.before()
        self.build()
        self.upload()
        self.extract()
        self.install()
        self.make_links()
        self.restart()
        self.after()

    def before(self):
        if not self.force and exists(self.env_dir):
            abort(
                'The deployment directory {0} already exists. Use '
                'deploy:force=yes to overwrite it.'
                .format(self.env_dir))

    def after(self):
        pass

    def build(self):
        """Gather the necessary resources and create a tarball."""
        # Create the local deployment directory structure
        if os.path.exists(self.build_dir):
            shutil.rmtree(self.build_dir)
        os.makedirs(self.build_dir)
        for path in ('config', 'var', 'var/log'):
            os.mkdir(os.path.join(self.build_dir, path))

        if os.path.exists('dist'):
            shutil.copytree('dist', self.build_paths['dist'])

        self.sdist()
        # TODO: Create sdists for develop eggs

        # Copy buildout.cfg
        dest = os.path.join(self.build_dir, 'buildout.cfg')
        self._render_template('deploy.cfg', dest)

        # Copy Paste config file
        shutil.copy('production.ini', self.build_paths['config'])

        # Copy static files
        shutil.copytree(env.static_dir, self.build_paths['static'])

        # Create tarball
        t = tarfile.open(self.build_paths['tarball'], 'w:gz')
        with contextlib.closing(t) as tarball:
            tarball.add(self.build_dir, self.env_name)
        os.chmod(self.build_paths['tarball'], 0640)

    def upload(self):
        remote_path = '{0.env_base_dir}/{0.tarball_name}'.format(self)
        put(self.build_paths['tarball'], remote_path, mirror_local_mode=True)

    def extract(self):
        with cd(self.env_base_dir):
            run('tar -x -f {0.tarball_name}'.format(self))
            run('rm {0.tarball_name}'.format(self))
            run('rm -rf {0.static_server_path}'.format(env))
            with cd(self.env_dir):
                run('cp -R static {0.static_server_path}'.format(env))

    def sdist(self):
        sdist(dist_dir=self.build_paths['dist'])

    def make_links(self):
        # Update symlink to static files
        with cd(env.static_server_base_dir):
            run('rm -f {0.link_name}'.format(self))
            run('ln -s {0.static_server_path} {1.link_name}'.format(env, self))
        # Update symlink to env dir
        with cd(self.env_base_dir):
            run('rm -f {0.link_name}'.format(self))
            run('ln -s {0.env_name} {0.link_name}'.format(self))

    def clean_buildout(self):
        """Remove package from Buildout cache or it won't be reinstalled."""
        dist_name = '{egg_name}-{version}.*'.format(**env)
        egg_name = '{egg_name}-{version}-*.egg'.format(**env)
        with cd(self.buildout_dir):
            # Remove source distribution from Buildout download cache
            run('rm -rf downloads/dist/{0}'.format(dist_name))
            # Remove existing egg from Buildout egg cache
            run('rm -rf eggs/{0}'.format(egg_name))

    def install(self):
        self.clean_buildout()
        with cd(self.env_dir):
            with path(env.get('PATH', ''), behavior='prepend'):
                run('buildout')
        with cd(self.env_base_dir):
            # Disallow other access to all.
            run('chmod -R o-rwx .')
            # Disallow group write access.
            run('chmod -R g-w .')
            # Ensure user has full access to everything and group has read
            # access to everything.
            run('chmod -R u+rw,g+r .')
            run('find . -type d | xargs chmod ug+x')
            # Ensure other has access to static files.
            run('chmod -R o+r static')
            run('find static -type d | xargs chmod o+x')

    def restart(self):
        with cd(self.env_dir):
            run('uwsgi --reload ~/var/run/uwsgi/bycycle.pid')

    def _render_template(self, source, destination):
        """Copy ``source`` to ``destination``, applying **env.

        ``source`` should be a file name. Its contents will be treated as
        a string template to which `.format(**env)` will be applied. The
        resulting string will be written to ``destination``.

        ``destination`` can be a file path or a directory. If it's the
        latter, ``source`` will be copied into the specified directory.

        """
        if os.path.isdir(destination):
            destination = os.path.join(destination, os.path.basename(source))
        with open(source) as source:
            contents = source.read().format(**env)
        with open(destination, 'w') as destination:
            destination.write(contents)


deploy = Deployer()
