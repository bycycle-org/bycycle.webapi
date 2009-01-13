###############################################################################
# $Id: setup.py 459 2007-02-15 12:05:14Z bycycle $
# Created 2006-09-07
#
# Project setup for byCycle Trip Planner.
#
# Copyright (C) 2006, 2007 Wyatt Baldwin, byCycle.org <wyatt@bycycle.org>.
# All rights reserved.
#
# For terms of use and warranty details, please see the LICENSE file included
# in the top level of this distribution. This software is provided AS IS with
# NO WARRANTY OF ANY KIND.
###############################################################################
from setuptools import setup, find_packages

setup(
    name='byCycleTripPlanner',
    version='0.4a0',
    description='byCycle Trip Planner',
    long_description='byCycle Trip Planner Web Application',
    license='GPLv3',
    author='Wyatt L Baldwin, byCycle.org',
    author_email='wyatt@byCycle.org',
    keywords='bicycle bike cycyle trip planner route finder',
    url='http://bycycle.org/',
    # This, in effect, creates an alias to the latest 0.4 dev version
    download_url='http://guest:guest@code.bycycle.org/apps/web/tripplanner/trunk#egg=byCycleTripPlanner-dev',
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Environment :: Web Environment',
        'Framework :: Pylons',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: GNU General Public License (GPL)',
        'Natural Language :: English',
        'Operating System :: POSIX :: Linux',
        'Programming Language :: Python',
        'Topic :: Education',
        'Topic :: Scientific/Engineering :: GIS',
    ],
    packages=find_packages(),
    zip_safe=False,
    install_requires=(
        'byCycleCore>=0.4a0.dev,==dev',
        'WebHelpers==0.3',
        'Routes>=1.10.2',
        'Beaker==0.7.2',
        'Mako==0.2.2',
        'Restler==0.1.1.1',
        'Pylons==0.9.5',
    ),
    test_suite = 'nose.collector',
    package_data={'tripplanner': ['i18n/*/LC_MESSAGES/*.mo']},
    entry_points="""
    [paste.app_factory]
    main=tripplanner:make_app

    [paste.app_install]
    main=paste.script.appinstall:Installer
    """,
    )
