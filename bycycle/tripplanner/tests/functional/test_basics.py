from bycycle.tripplanner.tests.functional import BaseTestCase


class TestBasics(BaseTestCase):

    def test_root_should_be_accessible(self):
        self.app.get('/', status=200)

    def test_images_should_be_accessible(self):
        self.app.get('/static/images/logo.png', status=200)

    def test_javascripts_should_be_accessible(self):
        self.app.get('/static/javascripts/bycycle.js', status=200)

    def test_stylesheets_should_be_accessible(self):
        self.app.get('/static/stylesheets/base.css', status=200)

    def test_notfound_view(self):
        self.app.get('/does/not/exist', status=404)
