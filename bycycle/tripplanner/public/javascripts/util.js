window.util = function () {
  var console_debug = function() {
    console.debug.apply(console, arguments);
  };

  var noop = function () {};

  var _public = {
    keys: function (obj) {
      var keys = [];
      for (var key in obj) {
        keys.push(key);
      }
      return keys;
    },

    values: function (obj) {
      var values = [];
      for (var key in obj) {
        values.push(obj[key]);
      }
      return values;
    },

    items: function (obj) {
      var items = [];
      for (var key in obj) {
        items.push(obj[key]);
      }
      return items;
    },

    noop: noop,

    log: {
      debug: (debug ? console_debug : noop)
    },

    /**
      * Get value for variable from query string if possible, otherwise use the
      * global config value
      */
    getParamVal: function (var_name, func) {
      // Override config setting with query string setting
      var v = util.request_params[var_name];
      if (typeof v == 'undefined') {
        // Query string override not given; use config
        v = app.config[var_name];
      } else if (typeof(func) == 'function') {
        // Process query string value with func, iff given
        v = func(v);
      }
      return v;
    },

    objectToQueryString: function (obj) {
      var params = [];
      for (var name in obj) {
        params.push([name, obj[name]].join('='));
      }
      var str = '?' + params.join('&');
      return str;
    },

    queryStringToObject: function (str) {
      if (str.charAt(0) == '?') {
        str = str.substring(1);
      }
      var params = {};
      var pairs = str.split('&');
      for (var name_value, i = 0; i < pairs.length; ++i) {
        name_value = pairs[i].split('=');
        params[name_value[0]] = name_value[1];
      }
      return params;
    },

    /** Script Functions **/

    writeScript: function(src, type) {
      type = type || 'text/javascript';
      document.write('<script src="' + src + '" type="' + type + '"></script>');
    },

    appendScript: function(src, type) {
      var script = document.createElement('script');
      script.type = type || 'text/javascript';
      script.src = src;
      document.body.appendChild(script);
    },

    /** String Functions **/

    /**
      * Remove leading and trailing whitespace from a string and
      * reduce internal runs of whitespace down to a single space.
      * @param the_string The string to clean
      * @param keep_newlines If this is set, reduce internal newlines to a single
      *        newline instead of a space
      * @return The cleaned string
      */
    cleanString: function(the_string, keep_newlines) {
      if (!the_string) { return ''; }
      // Remove leading and trailing whitespace
      the_string = the_string.replace(/^\s+|\s+$/g, '');
      // Reduce internal whitespace
      if (keep_newlines) {
        //the_string = the_string.replace(/[ \f\t\u00A0\u2028\u2029]+/, ' ');
        the_string = the_string.replace(/[^\n^\r\s]+/, ' ');
        the_string = the_string.replace(/\n+/g, '\n');
        the_string = the_string.replace(/\r+/g, '\r');
        the_string = the_string.replace(/(?:\r\n)+/g, '\r\n');
      } else {
        the_string = the_string.replace(/\s+/g, ' ');
      }
      return the_string;
    },

    /**
      * Remove leading and trailing whitespace from a string.
      *
      * @param the_string The string to trim
      * @return The trimmed string
      */
    trim: function(the_string) {
      return the_string.replace(/^\s+|\s+$/g, '');
    },

    /**
      * Join a list of strings, separated by the given string, excluding any empty
      * strings in the input list.
      *
      * @param the_list The list to join
      * @param the_string The string to insert between each string in the list
      *        (default: ' ')
      * @return The joined string
      */
    join: function(the_list, join_string) {
      join_string = join_string || ' ';
      var new_list = [];
      for (var i = 0; i < the_list.length; ++i) {
        word = _trim(the_list[i]);
        if (word) { new_list.push(word); }
      }
      return new_list.join(join_string);
    }
  };
  _public.request_params = _public.queryStringToObject(window.location.search);
  return _public;
}();


window.NameSpace = function (name, parent, definition) {
  var ns = definition || {};
  ns.__name__ = name;
  ns.__parent__ = parent;
  parent[name] = ns;
  if (!ns.initialize) {
    ns.initialize = function () {};
  }
  return ns;
};


window.Class = function (namespace, name, base, definition) {
  base = base || Function;
  definition = definition || {};
  // Create the skeleton of the class. The statements in this function will
  // be called whenever ``new <namespace>.<name>`` is called (that is,
  // whenever an instance is created from the class.
  var cls = function () {
    this.superclass = cls.superclass;
    this.initialize.apply(this, arguments);
  };
  // Set "special" class attributes.
  cls.superclass = base.prototype;
  cls.__name__ = name;
  cls.__namespace__ = namespace;
  // Set class's initial attributes to base class's attributes.
  cls.prototype = {};
  for (var attr in base.prototype) {
    cls.prototype[attr] = base.prototype[attr];
  }
  // Add user-friendly default toString method.
  var default_string_value = ['<class ', name, '>'].join('');
  cls.prototype.toString = function () {
    return default_string_value;
  };
  cls.prototype.__class__ = cls;
  // Add class attributes, overriding base class attributes.
  for (var attr in definition) {
    cls.prototype[attr] = definition[attr];
  }
  // Ensure the class has an initialization method.
  var initialize = cls.prototype.initialize;
  cls.prototype.initialize = initialize || function () {};
  // Set the class's constructor to the function defined above.
  cls.prototype.constructor = cls;
  // Add the class to the specified namespace/namespace.
  namespace[name] = cls;
  // Added this because it might be useful in certain scenarios.
  return cls;
};
