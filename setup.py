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
    classifiers=(
        'Development Status :: 3 - Alpha',
        'Environment :: Web Environment',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: GNU General Public License v3 (GPLv3)',
        'Programming Language :: Python :: 3.3',
    ),
    packages=find_packages(),
    include_package_data=True,
    zip_safe=False,
    install_requires=(
        'bycycle.core>=0.5a2',
        'tangled.mako',
        'tangled.sqlalchemy',
        'tangled.web',
    ),
    extras_require=dict(
        dev=(
            'tangled.web[dev]'
        ),
        test=(
            'coverage>=3.7',
            'WebTest>=2.0.10',
        ),
    ),
    test_suite='bycycle.tripplanner',
)
