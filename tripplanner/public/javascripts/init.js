/** Namespace for initialization that needs to happen before any other
 *  modules are loaded and while the page is still loading. For example, the
 *  Google Maps API needs to be loaded during page load because it uses
 *  ``document.write`` to load the main API script.
 *
 * This namespace should have ZERO dependencies.
 */
 var INIT = function () {
  var hostname = location.hostname;
  var port = location.port;
  var domain = port ? [hostname, port].join(':') : hostname;

  var maps = {
    google: {
      api_url: 'http://maps.google.com/maps?file=api&amp;v=2&amp;key=',
      api_keys: {
        'tripplanner.bycycle.org':    'ABQIAAAAd_4WmZlgvQzchd_BQM0MPhQ8y5tnWrQRsyOlME1eHkOS3wQveBSeFCpOUAfP10H6ec-HcFWPgiJOCA',
        'satellite.bycycle.org:5000': 'ABQIAAAAd_4WmZlgvQzchd_BQM0MPhRY_I4CLwGh95qVWYjrRjsuZNzP3BSOxRXLsVSuuatyFhv0hQfFohQxBQ',
        'prototype.bycycle.org':      'ABQIAAAAd_4WmZlgvQzchd_BQM0MPhTPU6PNPDk7LC31EIff_k4JZWpNmBQshai4v8RM5FaT-4FRWeyJA4VHaQ',
        'dev.bycycle.org':            'ABQIAAAAd_4WmZlgvQzchd_BQM0MPhQSskL_eAzZotWlegWekqLPLda0sxQZNf0_IshFell3z8qP8s0Car117A',
        'dev.bycycle.org:5000':       'ABQIAAAAd_4WmZlgvQzchd_BQM0MPhTkxokDJkt52pLJLqHCpDW3lL7iXBTREVLn9gCRhMUesO754WIidhTq2g',
        'bycycle.org':                'ABQIAAAAupb-OM5MU-8ZDqS4tVNkBBRa1vtdiGjU4Osv1KyKd6Mlr4BuWxQrO1eNXOimVbjcfI1DiLeH-XnIuw',
        'www.bycycle.org':            'ABQIAAAAd_4WmZlgvQzchd_BQM0MPhR8QNZ8KuqqtskDzJsLddnT1fGweRTgDdVI-oPLr79jrZgA_-87uWVc5w',
        'bycycle.metro-region.org':   'ABQIAAAAd_4WmZlgvQzchd_BQM0MPhR7upyhxOh7UQa5Yu3ebGZe2uQ8SxRPJtyMUYYgIBQsAROpcOySx6G1RQ'
      },
      getAPIURL: function () {
        var api_url = maps.google.api_url;
        var api_key = maps.google.api_keys[domain];
        return api_url + api_key;
      }
    },
    openlayers: {
      api_url: 'http://openlayers.org/api/OpenLayers.js',
      getAPIURL: function () {
        return maps.openlayers.api_url;
      }
    }
  };

  var loadMapsAPI = function (region_id) {
    var map_types = {
      all: 'google',
      portlandor: 'openlayers'
    }
    var map_type = map_types[region_id || 'all'];
    var getAPIURL = maps[map_type].getAPIURL;
    document.write(
      '<script type="text/javascript" src="' + getAPIURL() + '"></script>');
  };

  return {
    initialize: function (region_id) {
      loadMapsAPI(region_id);
      return {/* init data to pass to app--e.g. `domain` if need */};
    }
  }
}();
