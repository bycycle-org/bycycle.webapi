from setuptools import setup, find_packages


setup(
    name='bycycle.tripplanner',
    version='0.5a3',
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
        'bycycle.core>=0.5a2',
        'Beaker>=1.6.4',
        'Mako>=0.9.0',
        'Pyramid>=1.4.5',
        'pyramid_exclog>=0.7',
        'pyramid_mako>=0.3.1',
        'pyramid_tm>=0.5',
        'WebHelpers>=1.3',
        'zope.sqlalchemy>=0.7.3',
    ),
    extras_require=dict(
        dev=(
            'pyramid_debugtoolbar>=1.0.9',
            'waitress>=0.8.8',
            'zest.releaser>=3.49',
        ),
        test=(
            'coverage>=3.7',
            'WebTest>=2.0.10',
        ),
        deploy=(
            'Fabric>=1.8.0',
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
