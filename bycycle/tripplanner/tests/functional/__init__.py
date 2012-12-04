import os
import unittest

from paste.deploy import loadapp
from webtest import TestApp


default_config_file = os.path.join(os.getcwd(), 'test.ini')


def configure(config_file):
    global default_config_file
    default_config_file = config_file


class BaseTestCase(unittest.TestCase):

    def setUp(self, config_file=None):
        if config_file is None:
            config_file = default_config_file
        self.wsgi_app = loadapp('config:' + config_file)
        self.app = TestApp(self.wsgi_app)
