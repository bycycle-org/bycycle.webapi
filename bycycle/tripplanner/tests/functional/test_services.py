from bycycle.tripplanner.tests import *

class TestServiceController(TestController):
    def test_find_member(self):
        u = url('services', region_id='portlandor', action='find',
                q='633 n alberta')
        print u
        assert u == '/regions/portlandor/services/find?q=633+n+alberta'
        response = self.app.get(u)
        assert response.status == 302
