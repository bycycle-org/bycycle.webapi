from bycycle.tripplanner.tests.functional import BaseTestCase


class TestGeocodes(BaseTestCase):

    def test_query(self):
        self.app.get(
            '/geocode/find',
            params={
                'q': '633 n alberta',
                'region': 'portlandor',
            }
        )

    def test_query_json(self):
        self.app.get(
            '/geocode/find',
            headers={
                'accept': 'application/json',
            },
            params={
                'q': '633 n alberta',
                'region': 'portlandor',
            }
        )

    def test_query_300(self):
        self.app.get(
            '/geocode/find',
            params={
                'q': '633 alberta',
                'region': 'portlandor',
            }
        )

    def test_query_404(self):
        self.app.get(
            '/geocodes/find',
            params={
                'q': '100 N Fake St',
                'region': 'portlandor',
            },
            status=404)

    def test_query_missing_q(self):
        self.app.get('/geocode/find', status=400)
