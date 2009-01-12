from tripplanner.tests import *

class TestRegionsController(TestController):
    def test_index(self):
        url = url_for('regions')
        response = self.app.get(url)
