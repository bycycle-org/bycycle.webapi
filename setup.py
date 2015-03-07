from setuptools import setup, find_packages


setup(
    name='bycycle.tripplanner',
    version='0.6.dev0',
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
        'Programming Language :: Python :: 3.3',
    ],
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    install_requires=[
        'bycycle.core>=0.6.dev0',
        'tangled.mako>=0.1a3',
        'Mako>=1.0.1',
        'tangled.sqlalchemy>=0.1a3',
        'tangled.web>=0.1a9',
    ],
    extras_require={
        'dev': [
            'bycycle.core[dev]',
            'rjsmin>=1.0.9',
            'WebTest>=2.0.15',
        ],
    },
    test_suite='bycycle.tripplanner',
)
