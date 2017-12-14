from bycycle.tripplanner.tests.functional import BaseTestCase


class TestDirections(BaseTestCase):

    def test_query(self):
        self.app.get(
            '/directions',
            params={
                'term': 'NE 9th & Holladay to NE 15th & Fremont',
            }
        )

    def test_query_300(self):
        self.app.get(
            '/directions',
            params={
                'from': 'NE 9th & Holladay',
                'to': '6th & Burnside',
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
