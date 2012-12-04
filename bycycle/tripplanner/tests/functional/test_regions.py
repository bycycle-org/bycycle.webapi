from bycycle.tripplanner.tests.functional import BaseTestCase


class TestRegions(BaseTestCase):

    def test_index(self):
        self.app.get('/regions', status=200)


class TestRegion(BaseTestCase):

    def test_get(self):
        self.app.get('/regions/portlandor', status=200)

    def test_get_unknown(self):
        self.app.get('/regions/not-a-region', status=404)

    def test_with_q_param(self):
        path = '/regions/portlandor'
        q = '633 n alberta'
        q_encoded = q.replace(' ', '+')
        response = self.app.get(path, params={'q': q}, status=303)
        self.assertIn(path + '/geocodes/find', response.location)
        self.assertIn('q={0}'.format(q_encoded), response.location)
        response = response.follow(status=200)
