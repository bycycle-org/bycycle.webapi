from setuptools import setup, find_packages


setup(
    name='bycycle.tripplanner',
    version='0.5.dev0',
    description='byCycle Trip Planner',
    long_description='byCycle Bicycle Trip Planner Web Application',
    license='GPLv3',
    author='Wyatt L Baldwin, byCycle.org',
    author_email='wyatt@bycycle.org',
    keywords='bicycle bike cycyle trip planner route finder',
    url='http://bycycle.org/',
    download_url='https://bitbucket.org/wyatt/bycycle.core',
    classifiers=(
        'Development Status :: 3 - Alpha',
        'Environment :: Web Environment',
        'Framework :: Pylons',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: GNU General Public License v3 (GPLv3)',
        'Programming Language :: Python :: 2.7',
    ),
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    install_requires=(
        'bycycle.core>=0.5.dev0',
        'simplejson>=2.6.2',
        'Beaker>=1.6.4',
        'Routes>=1.13',
        'Mako>=0.7.3',
        'Restler>=0.7.1',
        'WebHelpers>=1.3',
        'Pylons>=1.0.1',
    ),
    test_suite = 'nose.collector',
    package_data={'bycycle.tripplanner': ['i18n/*/LC_MESSAGES/*.mo']},
    entry_points="""
    [paste.app_factory]
    main = bycycle.tripplanner.config.middleware:make_app

    [paste.app_install]
    main = pylons.util:PylonsInstaller

    [nose.plugins]
    pylons = pylons.test:PylonsPlugin
    """,
)
