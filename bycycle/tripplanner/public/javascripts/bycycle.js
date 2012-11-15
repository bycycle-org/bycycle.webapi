var byCycle = (function() {
  var config = {
    prod: {
      local: 0,
      map_type: 'google',
      map_state: 1
    },
    dev: {
      local: 1,
      map_type: 'base',
      map_state: 1
    }
  };

  var console_debug = function() {
   console.debug.apply(console, arguments);
  }

  var hostname = location.hostname;
  var port = location.port;

  return {
    // `debug` is a global set in the template; it's value is passed from
    // Pylons as an attribute of `app_globals`
    config: debug ? config.dev : config.prod,

    // Used to look up Google API key in gmap.js and to make queries in ui.js
    domain: (port ? [hostname, port].join(':') : hostname),

    // Prefix for when app is mounted somewhere other than root (/)
    prefix: byCycle_prefix,

    // URL query parameters as a Hash
    request_params: $H(location.search.toQueryParams()),

    default_map_type: 'base',

    // Namespace for byCycle widgets
    widget: {},

    /**
     * Get value for variable from query string if possible, otherwise use the
     * global config value
     */
    getParamVal: function(var_name, func) {
      // Override config setting with query string setting
      var v = byCycle.request_params.get(var_name);
      if (typeof v === 'undefined') {
      // Query string override not given; use config
        v = byCycle.config[var_name];
      } else if (typeof(func) == 'function') {
        // Process query string value with func, iff given
        v = func(v);
      }
      return v;
    },

    logDebug: (debug ? console_debug : function () {})
  };
})();
