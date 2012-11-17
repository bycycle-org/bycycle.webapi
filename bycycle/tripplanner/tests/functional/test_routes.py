from bycycle.tripplanner.tests import TestController, url


class TestRouteController(TestController):

    def test_find_member(self):
        u = url('find_routes', region_id='portlandor',
                q='633 n alberta to 3950 ne 15th ave, portland')
        assert u == ('/regions/portlandor/routes/find?'
                     'q=633+n+alberta+to+3950+ne+15th+ave%2C+portland')
        response = self.app.get(u)
        c = response.tmpl_context
        assert response.status_int == c.http_status == 200
        assert c.q == '633 n alberta to 3950 ne 15th ave, portland'
        assert hasattr(c, 'member')
        assert hasattr(c, 'route')
        assert c.member is c.route
