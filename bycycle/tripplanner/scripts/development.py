"""Scripts for development and testing and environments."""
import argparse
from coverage import coverage
import os
import sys
import unittest

from pyramid.scripts import pserve
from pyramid.scripts import pshell

from bycycle.tripplanner.tests import functional as functional_tests


def serve(argv=None):
    """A convenience wrapper around Pyramid's `pserve` command.

    The --reload flag is set by default, and development.ini in the current
    directory is used if no other --config-file is specified.

    The --reload option can be disabled with the --no-reload flag and a
    different --config-file can be given. Also, vars can be appended to the
    end of the command just a la `pserve`. To do anything more complicated
    than that, run the `pserve` command directly.

    """
    parser = argparse.ArgumentParser(description=serve.__doc__)
    parser.add_argument(
        '--no-reload', action='store_false', dest='reload', default=True,
        help='Disable code reloading',
    )
    parser.add_argument('--app-name', default='main')
    parser.add_argument('--server-name', default='main')
    parser.add_argument('--config-file', default='development.ini')
    parser.add_argument('vars', nargs='*', help='[key=val ...]')
    if argv is not None:
        args = parser.parse_args(argv)
    else:
        args = parser.parse_args()
    pargv = [
        './bin/pserve',
        '--app-name', args.app_name,
        '--server-name', args.server_name,
    ]
    if args.reload:
        pargv.append('--reload')
    pargv.append(args.config_file)
    pargv += args.vars
    sys.stdout.write('Running command: {0}\n'.format(' '.join(pargv)))
    pserve.main(pargv)


def shell():
    argv = ['./bin/pshell', 'test.ini']
    sys.stdout.write('Running command: {0}\n'.format(' '.join(argv)))
    pshell.main(argv=argv)


def test():
    """Convenience wrapper around unittest's automatic test discovery.

    Allows a Paste config file to specified; if one isn't, the default is
    test.ini from $PWD.

    To specify a different Paste config file, do this::

        ./bin/test --config-file=my_config_file.ini

    To show a coverage report, use the --with-coverage command line flag.

    To capture stdout, use the -b/--buffer command line flag. To stop running
    tests on the first error encountered, use the -f/--failfast command line
    flag.

    """
    parser = argparse.ArgumentParser(description=test.__doc__)
    parser.add_argument('--config-file')
    parser.add_argument('--with-coverage', action='store_true', default=False)
    parser.add_argument('-b', '--buffer', action='store_true', default=False)
    parser.add_argument('-f', '--failfast', action='store_true', default=False)
    parser.add_argument('tests', nargs='*', default=None)
    args = parser.parse_args()

    config_file = args.config_file
    if config_file is not None:
        config_file = os.path.abspath(config_file)
        functional_tests.configure(config_file=config_file)

    if args.with_coverage:
        cov = coverage(branch=True, source=['.'])
        cov.start()
    loader = unittest.TestLoader()
    if args.tests:
        suite = loader.loadTestsFromNames(args.tests)
    else:
        suite = loader.discover('.')
    runner = unittest.TextTestRunner(
        buffer=args.buffer, failfast=args.failfast)
    runner.run(suite)
    if args.with_coverage:
        cov.stop()
        cov.report(include=['bycycle/*'])
