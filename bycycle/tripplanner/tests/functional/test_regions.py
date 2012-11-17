from bycycle.tripplanner.tests import TestController, url


class TestRegionsController(TestController):

    def test_index(self):
        response = self.app.get(url('regions'))
