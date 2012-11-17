from bycycle.tripplanner.tests import TestController, url


class TestServiceController(TestController):
    def test_find_member(self):
        u = url('find_services', region_id='portlandor', q='633 n alberta')
        assert u == '/regions/portlandor/services/find?q=633+n+alberta'
        response = self.app.get(u)
        assert response.status_int == 302
