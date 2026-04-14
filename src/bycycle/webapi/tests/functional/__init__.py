import os
import unittest

from pyramid.paster import get_app

from webtest import TestApp


default_config_file = os.path.join(os.getcwd(), 'test.ini')


class BaseTestCase(unittest.TestCase):

    def setUp(self, config_file=None):
        self.wsgi_app = get_app(default_config_file)
        self.app = TestApp(self.wsgi_app)
