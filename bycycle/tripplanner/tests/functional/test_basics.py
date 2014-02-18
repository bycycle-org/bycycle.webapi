from bycycle.tripplanner.tests.functional import BaseTestCase


class TestBasics(BaseTestCase):

    def test_root_should_be_accessible(self):
        self.app.get('/', status=200)

    def test_images_should_be_accessible(self):
        self.app.get('/static/img/logo.png', status=200)

    def test_javascripts_should_be_accessible(self):
        self.app.get('/static/js/bycycle.js', status=200)

    def test_stylesheets_should_be_accessible(self):
        self.app.get('/static/css/base.css', status=200)

    def test_notfound_view(self):
        self.app.get('/does/not/exist', status=404)
