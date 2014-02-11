from setuptools import setup, find_packages


setup(
    name='bycycle.tripplanner',
    version='0.5a3',
    description='byCycle Trip Planner',
    long_description='byCycle Bicycle Trip Planner Web Application',
    license='GPLv3',
    author='Wyatt L Baldwin, byCycle.org',
    author_email='wyatt@bycycle.org',
    keywords='bicycle bike cycle trip planner route finder',
    url='http://bycycle.org/',
    download_url='https://bitbucket.org/wyatt/bycycle.core',
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Environment :: Web Environment',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: GNU General Public License v3 (GPLv3)',
        'Programming Language :: Python :: 3.3',
    ],
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    install_requires=[
        'bycycle.core>=0.5a2',
        'tangled.mako>=0.1a2',
        'tangled.sqlalchemy>=0.1a2',
        'tangled.web>=0.1a6',
    ],
    extras_require={
        'dev': [
            'bycycle.core[dev]>=0.5a2',
            'WebTest>=2.0.14',
        ],
    },
    test_suite='bycycle.tripplanner',
)
