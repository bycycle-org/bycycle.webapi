from bycycle.tripplanner.tests.functional import BaseTestCase


class TestLookup(BaseTestCase):

    def test_query(self):
        self.app.get(
            '/lookup',
            params={
                'term': 'NE 9th & Holladay',
            }
        )

    def test_query_300(self):
        self.app.get(
            '/lookup',
            params={
                'term': '6th & Burnside',
            }
        )

    def test_query_404(self):
        self.app.get(
            '/lookup',
            params={
                'term': '100 N Fake St',
            },
            status=404)

    def test_query_missing_term(self):
        self.app.get('/lookup', status=400)
