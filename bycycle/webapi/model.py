from sqlalchemy.engine import engine_from_config

import zope.sqlalchemy

from bycycle.core.model import *


def get_engine(settings, prefix='sqlalchemy.'):
    return engine_from_config(settings, prefix=prefix)


def get_tm_session(session_factory, transaction_manager):
    session = session_factory()
    zope.sqlalchemy.register(session, transaction_manager=transaction_manager)
    return session


def includeme(config):
    settings = config.get_settings()
    settings['tm.manager_hook'] = 'pyramid_tm.explicit_manager'
    session_factory = get_session_factory(get_engine(settings))

    config.include('pyramid_tm')
    config.include('pyramid_retry')
    config.registry['dbsession_factory'] = session_factory

    config.add_request_method(
        lambda request: get_tm_session(session_factory, request.tm), 'dbsession', reify=True)
