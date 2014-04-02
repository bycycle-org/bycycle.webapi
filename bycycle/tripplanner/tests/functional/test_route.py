from bycycle.tripplanner.tests.functional import BaseTestCase


class TestRoutes(BaseTestCase):

    def test_query(self):
        self.app.get(
            '/route/find',
            params={
                'q': '633 n alberta to 4807 se kelly, portland',
            }
        )

    def test_query_json(self):
        self.app.get(
            '/route/find',
            headers={'accept': 'application/json'},
            params={
                's': '633 n alberta',
                'e': '4807 se kelly, portland',
            }
        )

    def test_query_300(self):
        self.app.get(
            '/route/find',
            params={
                'q': '633 alberta to 4807 se kelly',
            },
            status=300
        )

    def test_query_address_not_found(self):
        self.app.get(
            '/route/find',
            params={
                's': '100 N Fake St',
                'e': '200 S Wut Ave',
            },
            status=404)

    def test_query_missing_q(self):
        self.app.get('/route/find', status=400)
