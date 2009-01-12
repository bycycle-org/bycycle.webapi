import paste.fixture
from bycycle.tripplanner.tests import *

class TestGeocodesController(TestController):
    def test_find_member(self):
        url = url_for('geocodes', region_id='portlandor', action='find',
                      q='633 n alberta')
        print url
        assert url == '/regions/portlandor/geocodes/find?q=633+n+alberta'
        response = self.app.get(url)
        assert response.status == response.c.http_status == 200
        assert response.c.q == '633 n alberta'
        assert hasattr(response.c, 'member')
        assert hasattr(response.c, 'geocode')
        #assert response.c.member == response.c.geocode

    def test_find_member_300(self):
        url = url_for('geocodes', region_id='portlandor', action='find',
                      q='633 alberta')
        assert url == '/regions/portlandor/geocodes/find?q=633+alberta'
        response = self.app.get(url)
        assert response.status == response.c.http_status == 300
        assert response.c.q == '633 alberta'
        assert hasattr(response.c, 'collection')
        assert hasattr(response.c, 'geocodes')
        #assert response.c.collection == response.c.geocodes

    def test_find_collection(self):
        url = url_for('geocodes', region_id='portlandor', action='find',
                      q=str(['633 n alberta', '4807 se kelly']))
        assert url == ('/regions/portlandor/geocodes/find?'
                       'q=%5B%27633+n+alberta%27%2C+%274807+se+kelly%27%5D')
        response = self.app.get(url, status=400)
