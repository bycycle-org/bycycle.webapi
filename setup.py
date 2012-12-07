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
        'Beaker>=1.6.4',
        'Pyramid>=1.4b1',
        'pyramid_exclog>=0.6',
        'pyramid_tm>=0.5',
        'Mako>=0.7.3',
        'WebHelpers>=1.3',
        'zope.sqlalchemy>=0.7.1',
    ),
    extras_require=dict(
        dev=(
            'pyramid_debugtoolbar>=1.0.3',
            'waitress>=0.8.2',
            'zest.releaser>=3.34',
        ),
        test=(
            'coverage>=3.5.3',
            'WebTest>=1.3.4',
        ),
        deploy=(
            'Fabric>=1.5.1',
        ),
    ),
    test_suite='bycycle.tripplanner',
    entry_points="""
    [paste.app_factory]
    main = bycycle.tripplanner.app:main

    [console_scripts]
    serve = bycycle.tripplanner.scripts.development:serve
    shell = bycycle.tripplanner.scripts.development:shell
    test = bycycle.tripplanner.scripts.development:test
    """,
)
