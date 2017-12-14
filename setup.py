from setuptools import setup, PEP420PackageFinder

find_packages = PEP420PackageFinder.find


setup(
    name='bycycle.tripplanner',
    version='0.6.dev5',
    description='byCycle Trip Planner',
    long_description='byCycle Bicycle Trip Planner Web Application',
    license='GPLv3',
    author='Wyatt L Baldwin, byCycle.org',
    author_email='wyatt@bycycle.org',
    keywords='bicycle bike cycle trip planner route finder directions',
    url='http://bycycle.org/',
    download_url='https://bitbucket.org/bycycle/bycycle.core',
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Environment :: Web Environment',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: GNU General Public License v3 (GPLv3)',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.5',
    ],
    packages=find_packages(include=['bycycle', 'bycycle.tripplanner', 'bycycle.tripplanner.*']),
    include_package_data=True,
    install_requires=[
        'bycycle.core>=0.6.dev5',
        'Mako>=1.0.7',
        'tangled.mako>=1.0a5',
        'tangled.sqlalchemy>=0.1a5',
        'tangled.web>=1.0a12',
    ],
    extras_require={
        'dev': [
            'bycycle.core[dev]>=0.6.dev5',
            'WebTest>=2.0.29',
        ],
    },
    test_suite='bycycle.tripplanner',
)
