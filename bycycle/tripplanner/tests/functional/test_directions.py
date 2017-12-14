from bycycle.tripplanner.tests.functional import BaseTestCase


class TestDirections(BaseTestCase):

    def test_query(self):
        self.app.get(
            '/directions',
            params={
                'term': '633 n alberta to 4807 se kelly, portland',
            }
        )

    def test_query_json(self):
        self.app.get(
            '/directions',
            headers={'accept': 'application/json'},
            params={
                'from': '633 n alberta',
                'to': '4807 se kelly, portland',
            }
        )

    def test_query_300(self):
        self.app.get(
            '/directions',
            params={
                'term': '633 alberta to 4807 se kelly',
            },
            status=300
        )

    def test_query_address_not_found(self):
        self.app.get(
            '/directions',
            params={
                'from': '100 N Fake St',
                'to': '200 S Wut Ave',
            },
            status=404)

    def test_query_missing_term(self):
        self.app.get('/directions', status=400)
