var byCycle = (function (globalConfig) {
  var config = {
    prod: {
      map_type: 'openlayers',
      map_state: 1
    },
    dev: {
      map_type: 'base',
      map_state: 1
    }
  };
  $.extend(config, globalConfig);

  var search = window.location.search.substring(1),
      params = {};
  search.replace(/([^=&]+)=([^&]*)/g, function(m, name, value) {
    params[decodeURIComponent(name)] = decodeURIComponent(value);
  });

  return {
    debug: config.debug,
    config: config.debug ? config.dev : config.prod,

    // Prefixes for when app is mounted somewhere other than root (/)
    prefix: config.prefix,
    staticPrefix: config.staticPrefix,

    writeScript: function(src, type) {
      type = type || 'text/javascript';
      document.write('<script src="' + src + '" type="' + type + '"></script>');
    },

    /**
     * Get value query string parameter. If the parameter isn't present,
     * use the default value if supplied, or try to get the value from
     * config.
     *
     * @param name
     * @param processor Iff the query parameter is present, process it
     *        with this function.
     * @param defaultValue
     */
    getParamVal: function (name, processor, defaultValue) {
      // Override config setting with query string setting
      var v = params[name];
      if (typeof v === 'undefined') {
        if (typeof defaultValue !== 'undefined') {
          v = defaultValue;
        } else {
          v = config[name];
        }
      } else if (typeof processor === 'function') {
        v = processor(v);
      }
      return v;
    },

    inheritFrom: function (superType, properties) {
      if (!properties.hasOwnProperty('constructor')) {
        properties.constructor = function () {
          superType.apply(this, arguments);
        }
      }
      var intermediateType = function () {},
          constructor = properties.constructor;
      intermediateType.prototype = superType.prototype;
      constructor.prototype = new intermediateType;
      $.extend(constructor.prototype, properties);
      constructor.prototype.superType = superType;
      return constructor;
    }
  };
}(byCycle));
