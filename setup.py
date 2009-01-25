###############################################################################
# $Id: setup.py 459 2007-02-15 12:05:14Z bycycle $
# Created 2006-09-07
#
# Project setup for byCycle Trip Planner.
#
# Copyright (C) 2006-2008 Wyatt Baldwin, byCycle.org <wyatt@bycycle.org>.
# All rights reserved.
#
# For terms of use and warranty details, please see the LICENSE file included
# in the top level of this distribution. This software is provided AS IS with
# NO WARRANTY OF ANY KIND.
###############################################################################
from setuptools import setup, find_packages

setup(
    name='byCycleTripPlanner',
    version='0.5',
    description='byCycle Trip Planner',
    long_description='byCycle Bicycle Trip Planner Web Application',
    license='GNU General Public License (GPL)',
    author='Wyatt L Baldwin, byCycle.org',
    author_email='wyatt@bycycle.org',
    keywords='bicycle bike cycyle trip planner route finder',
    url='http://bycycle.org/',
    download_url='http://guest:guest@code.bycycle.org/TripPlanner/trunk#egg=byCycleTripPlanner-dev',
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
        'simplejson>=2.0.7',
        'Beaker>=1.1.3',
        'Routes>=1.10.2',
        'Mako==0.2.4',
        'Restler>=0.3a0',
        'WebHelpers>=0.6.4',
        'Pylons>=0.9.7rc4',
    ),
    test_suite = 'nose.collector',
    package_data={'bycycle.tripplanner': ['i18n/*/LC_MESSAGES/*.mo']},
    entry_points="""
    [paste.app_factory]
    main=bycycle.tripplanner:make_app

    [paste.app_install]
    main=paste.script.appinstall:Installer
    """,
    )
