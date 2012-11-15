from bycycle.tripplanner.tests import *

class TestRegionsController(TestController):
    def test_index(self):
        response = self.app.get(url('regions'))
