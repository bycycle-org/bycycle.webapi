from bycycle.tripplanner.tests import TestController, url


class TestGeocodesController(TestController):

    def test_find_member(self):
        u = url('find_geocodes', region_id='portlandor', q='633 n alberta')
        assert u == '/regions/portlandor/geocodes/find?q=633+n+alberta'
        response = self.app.get(u)
        c = response.tmpl_context
        assert response.status_int == c.http_status == 200
        assert c.q == '633 n alberta'
        assert hasattr(c, 'member')
        assert hasattr(c, 'geocode')
        assert c.member is c.geocode

    def test_find_member_300(self):
        u = url('find_geocodes', region_id='portlandor', q='633 alberta')
        assert u == '/regions/portlandor/geocodes/find?q=633+alberta'
        response = self.app.get(u)
        c = response.tmpl_context
        assert response.status_int == c.http_status == 300
        assert c.q == '633 alberta'
        assert hasattr(c, 'collection')
        assert hasattr(c, 'geocodes')
        assert c.collection is c.geocodes
