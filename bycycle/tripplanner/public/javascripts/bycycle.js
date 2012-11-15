/**
 * byCycle namespace
 */
var byCycle = (function() {
  // private:
  var prod_config = {
    local: 0,
    map_type: 'google',
    map_state: 1
  };

  var dev_config = {
    local: 1,
    map_type: 'base',
    map_state: 1
  };

  var noop = function() {};

  var console_debug = function() {
	console.debug.apply(console, arguments);
  }

  var hostname = location.hostname;
  var port = location.port;

  // public:
  return {
    // `debug` is a global set in the template; it's value is passed from
    // Pylons as an attribute of the global `g`
    config: debug ? dev_config : prod_config,

    // Used to look Google API key in gmap.js and to make queries in ui.js
    domain: (port ? [hostname, port].join(':') : hostname),

    // Prefix for when app is mounted at other than root (/)
    prefix: byCycle_prefix,

    // URL query parameters as a Hash
    request_params: $H(location.search.toQueryParams()),

    default_map_type: 'base',

    noop: noop,

    // Namespace for byCycle widgets
    widget: {},

    /**
     * Get value for variable from query string if possible, otherwise use the
     * global config value
     */
    getParamVal: function(var_name, func) {
      // Override config setting with query string setting
      var v = byCycle.request_params[var_name];
      if (typeof(v) == 'undefined') {
	// Query string override not given; use config
        v = byCycle.config[var_name];
      } else if (typeof(func) == 'function') {
        // Process query string value with func, iff given
        v = func(v);
      }
      return v;
    },

    logDebug: (debug ? console_debug : noop)
  };
})();
