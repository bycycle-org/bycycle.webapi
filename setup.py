from setuptools import setup, PEP420PackageFinder

find_packages = PEP420PackageFinder.find


setup(
    name='bycycle.webapi',
    version='0.6.dev5',
    description='byCycle Web API',
    long_description='byCycle Web API',
    author='Wyatt Baldwin',
    author_email='wyatt@bycycle.org',
    keywords='bicycle bike cycle geocoder trip planner route finder directions',
    url='http://bycycle.org/',
    download_url='https://github.com/bycycle-org/bycycle.webapi',
    license='GPLv3',
    packages=find_packages(include=['bycycle', 'bycycle.webapi', 'bycycle.webapi.*']),
    include_package_data=True,
    zip_safe=False,
    install_requires=[
        'bycycle.core>=0.6.dev5',
        'cornice>=3.4.4',
        'Mako>=1.0.7',
        'plaster_pastedeploy>=0.6',
        'pyramid>=1.10',
        'pyramid_mako>=1.0.2',
        'pyramid_retry>=1.0',
        'pyramid_sqlalchemy>=1.6',
        'pyramid_tm>=2.2.1',
        'transaction>=2.4.0',
        'zope.sqlalchemy>=1.0',
    ],
    extras_require={
        'dev': [
            'bycycle.core[dev]',
            'coverage',
            'pyramid_debugtoolbar',
            'waitress',
            'WebTest',
        ],
    },
    entry_points={
        'paste.app_factory': [
            'main = bycycle.webapi:main',
        ],
    },
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Environment :: Web Environment',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: GNU General Public License v3 (GPLv3)',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.6',
    ],
)
