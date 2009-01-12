from tripplanner.tests import *

class TestServiceController(TestController):
    def test_find_member(self):
        url = url_for('services', region_id='portlandor', action='find',
                      q='633 n alberta')
        print url
        assert url == '/regions/portlandor/services/find?q=633+n+alberta'
        response = self.app.get(url)
        assert response.status == 302
