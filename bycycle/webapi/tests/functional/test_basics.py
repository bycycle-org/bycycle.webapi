from bycycle.webapi.tests.functional import BaseTestCase


class TestBasics(BaseTestCase):

    def test_root_should_be_accessible(self):
        self.app.get('/', status=200)

    def test_notfound_view(self):
        self.app.get('/does/not/exist', status=404)
