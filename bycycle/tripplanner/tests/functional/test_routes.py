from bycycle.tripplanner.tests.functional import BaseTestCase


class TestRoutes(BaseTestCase):

    def test_get(self):
        self.app.get('/regions/portlandor/routes')

    def test_query(self):
        self.app.get(
            '/regions/portlandor/routes/find',
            params={'q': '633 n alberta to 4807 se kelly, portland'},
            status=200)

    def test_query_json(self):
        self.app.get(
            '/regions/portlandor/routes/find',
            headers={'accept': 'application/json'},
            params={'s': '633 n alberta', 'e': '4807 se kelly, portland'},
            status=200)

    def test_query_json_ext(self):
        self.app.get(
            '/regions/portlandor/routes/find.json',
            params={'q': '633 n alberta to 4807 se kelly, portland'},
            status=200)

    def test_query_300(self):
        self.app.get(
            '/regions/portlandor/routes/find',
            params={'q': '633 alberta to 4807 se kelly'},
            status=300)

    def test_query_address_not_found(self):
        self.app.get(
            '/regions/portlandor/routes/find',
            params={'s': '100 N Fake St', 'e': '200 S Wut Ave'},
            status=404)

    def test_query_missing_q(self):
        self.app.get('/regions/portlandor/routes/find', status=400)
