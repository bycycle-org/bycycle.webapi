from setuptools import setup, PEP420PackageFinder

find_packages = PEP420PackageFinder.find


setup(
    name='bycycle.tripplanner',
    version='0.6.dev1',
    description='byCycle Trip Planner',
    long_description='byCycle Bicycle Trip Planner Web Application',
    license='GPLv3',
    author='Wyatt L Baldwin, byCycle.org',
    author_email='wyatt@bycycle.org',
    keywords='bicycle bike cycle trip planner route finder',
    url='http://bycycle.org/',
    download_url='https://bitbucket.org/bycycle/bycycle.core',
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Environment :: Web Environment',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: GNU General Public License v3 (GPLv3)',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.6',
    ],
    packages=find_packages(include=['bycycle', 'bycycle.tripplanner', 'bycycle.tripplanner.*']),
    include_package_data=True,
    install_requires=[
        'bycycle.core>=0.6.dev0',
        'tangled.mako>=0.1a3',
        'Mako>=1.0.6',
        'tangled.sqlalchemy>=0.1a5',
        'tangled.web>=0.1a10',
    ],
    extras_require={
        'dev': [
            'bycycle.core[dev]',
            'rjsmin>=1.0.12',
            'WebTest>=2.0.27',
        ],
    },
    test_suite='bycycle.tripplanner',
)
