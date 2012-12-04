from bycycle.tripplanner.tests.functional import BaseTestCase


class TestGeocodes(BaseTestCase):

    def test_get(self):
        self.app.get('/regions/portlandor/geocodes')

    def test_query(self):
        self.app.get(
            '/regions/portlandor/geocodes/find',
            params={'q': '633 n alberta'},
            status=200)

    def test_query_json(self):
        self.app.get(
            '/regions/portlandor/geocodes/find',
            headers={'accept': 'application/json'},
            params={'q': '633 n alberta'},
            status=200)

    def test_query_json_ext(self):
        self.app.get(
            '/regions/portlandor/geocodes/find.json',
            params={'q': '633 n alberta'},
            status=200)

    def test_query_300(self):
        self.app.get(
            '/regions/portlandor/geocodes/find',
            params={'q': '633 alberta'},
            status=300)

    def test_query_404(self):
        self.app.get(
            '/regions/portlandor/geocodes/find',
            params={'q': '100 N Fake St'},
            status=404)

    def test_query_missing_q(self):
        self.app.get('/regions/portlandor/geocodes/find', status=400)
