/**
 * Query Base Class
 */
byCycle.UI.Query = Class.create()
byCycle.UI.Query.prototype = {
  initialize: function(service, form, result_list,
                       opts /* processing_message='Processing...'
                               input=undefined */) {
    if (arguments.length == 0) return;
    this.ui = byCycle.UI;
    this.service = service;
    this.form = form;
    this.result_list = result_list;
    if (opts) {
      this.processing_message = opts.processing_message || 'Processing...';
      this.input = opts.input;  // Hash or undefined
    }
  },

  run: function() {
    var error_before = false;
    try {
      this.before();
    } catch (e) {
      error_before = true;
      this.ui.showErrors(e.message);
    }
    if (!error_before) {
      this.doQuery();
    }
  },

  before: function() {
    // Always do this
    // Base version should not raise errors
    this.start_ms = new Date().getTime();
    Element.show(this.ui.spinner);
    this.ui.status.innerHTML = this.processing_message;
    Element.hide(this.ui.message_pane);
  },

  doQuery: function() {
    // Done only if no errors in before()
    var path = ['regions', this.ui.region_id, this.service, 'find'].join('/')
    var url = [byCycle.prefix, path].join('');
    var params = this.input ? this.input : this.form.serialize(true);

    // Make bookmark
    var bookmark_params = Object.extend({}, params);
    delete bookmark_params.commit;
    var q_str = Hash.toQueryString(bookmark_params);
    this.ui.bookmark_link.href = [url, q_str].join('?');

    params.format = 'json';
    var args = {
      method:'get',
      onLoading: this.onLoading.bind(this),
      on200: this.on200.bind(this),
      on300: this.on300.bind(this),
      onFailure: this.onFailure.bind(this),
      onComplete: this.onComplete.bind(this),
      parameters: params
    };
    this.request = new Ajax.Request(url, args);
  },

  onLoading: function(request) {
    this.ui.status.update(this.processing_message);
    this.ui.spinner.show();
  },

  on200: function(request) {
    eval('var response = ' + request.responseText + ';');
    this.response = response;
    this.ui.showResultPane(this.result_list);
    var results = this.makeResults(response);
    // Show widget in result list for ``service``
    var li;
    var result_list = this.result_list;
    results.each(function (r) {
      li = $(document.createElement('li'));
      li.appendChild(r.widget.dom_node);
      result_list.appendChild(li);
    });
    // Process the results for ``service``
    // I.e., recenter map, place markers, draw line, etc
    this.processResults(response, results);
    this.ui.is_first_result = false;
  },

  on300: function(request) {
    this.onFailure(request);
  },

  onFailure: function(request) {
    this.ui.spinner.hide();
    eval('var response = ' + request.responseText + ';');
    this.response = response;
    this.ui.showMessagePane(this.ui.error_pane, response.fragment);
  },

  onComplete: function(request) {
    this.ui.spinner.hide();
    this.http_status = request.status;
    this.ui.status.update(this.getElapsedTimeMessage());
  },

  onException: function(request) {
    this.ui.spinner.hide();
  },

  /**
   * Make a ``Result`` for each result in the response. Each ``Result``
   * contains an ID, result object, associated map overlays, widget reference,
   * etc.
   *
   * @param response The response object (responseText evaled)
   */
  makeResults: function(response) {
    var results = [];

    // Extract top level DOM nodes from response HTML fragment (skipping text
    // nodes).
    // Note: The fragment should consist of a set of top level elements that
    // can be transformed into widgets.
    var div = document.createElement('div');
    div.innerHTML = response.fragment;
    var nodes = $(div).getElementsByClassName('fixed-pane');

    var result, dom_node;
    response.results.each((function (r, i) {
      dom_node = nodes[i];
      result = this.makeResult(r, dom_node);
      results.push(result);
    }).bind(this));

    return results;
  },

  /**
   * Make a ``Result`` for the given (JSON) ``result`` and ``dom_node``.
   * The ``Result`` will contain an ID, JSON result object, associated map
   * overlays, widget reference, etc.
   *
   * @param result A simple object from the evaled JSON response
   * @param dom_node A DOM node that contains the necessary elements to create
   *        a ``FixedPane`` widget.
   * @return ``Result``
   */
  makeResult: function (result, dom_node) {
    var id = [this.service, 'result', new Date().getTime()].join('_');
    dom_node.id = id;
    var widget = new byCycle.widget.FixedPane(dom_node, {destroy_on_close: true});
    var result_obj = new this.ui.Result(id, result, this.service, widget);
    widget.register_listeners('close', result_obj.remove.bind(result_obj));
    this.ui.results[this.service][id] = result_obj;
    return result_obj;
  },

  processResults: function(response, results) {},

  getElapsedTimeMessage: function() {
    var elapsed_time_msg = '';
    if (this.http_status < 400 && this.start_ms) {
      elapsed_time = (new Date().getTime() - this.start_ms) / 1000.0;
      var s = '';
      if (elapsed_time < 1) {
        elapsed_time = ' less than 1 ';
      } else if (elapsed_time > 1) {
        s = 's';
      }
      elapsed_time_msg = ['in ', elapsed_time, ' second', s, '.'].join('');
    }
    var status_message = this.ui.status_messages[this.http_status || 200];
    elapsed_time_msg = [status_message, elapsed_time_msg].join(' ');
    return elapsed_time_msg;
  }
};


/**
 * Geocode Query
 */
byCycle.UI.GeocodeQuery = Class.create();
byCycle.UI.GeocodeQuery.prototype = Object.extend(new byCycle.UI.Query(), {
  // Kludge.
  superclass: byCycle.UI.Query.prototype,

  initialize: function(opts /* form=byCycle.UI.query_form,
                               result_list=byCycle.UI.location_list,
                               processing_message='Locating address...',
                               input=undefined */) {
    opts = opts || {};
    var ui = byCycle.UI;
    var form = opts.form || ui.query_form;
    var result_list = opts.result_list || ui.location_list;
    opts.processing_message = opts.processing_message || 'Looking up address...';
    this.superclass.initialize.call(this, 'geocodes', form, result_list, opts);
  },

  before: function() {
    this.superclass.before.apply(this, arguments);
    var q;
    if (typeof(this.input) == 'undefined') {
      q = this.ui.q_el.value;
      if (!q) {
        this.ui.q_el.focus();
        throw new Error('Please enter an address!');
      }
    }
  },

  processResults: function(response, results) {
    var zoom = this.ui.is_first_result ? this.ui.map.default_zoom : undefined;
    // For each result, place a marker on the map.
    var div, content_pane;
    var placeGeocodeMarker = this.ui.map.placeGeocodeMarker.bind(this.ui.map);
    results.each(function (r) {
      div = document.createElement('div');
      content_pane = r.widget.content_pane.cloneNode(true);
      div.appendChild(content_pane);
      r.addOverlay(placeGeocodeMarker(r.result.point, div, zoom));
    });
  }
});


/**
 * Route Query
 */
byCycle.UI.RouteQuery = Class.create();
byCycle.UI.RouteQuery.prototype = Object.extend(new byCycle.UI.Query(), {
  // Kludge.
  superclass: byCycle.UI.Query.prototype,

  initialize: function(opts /* form=byCycle.UI.query_form,
                               result_list=byCycle.UI.location_list,
                               processing_message='Finding route...',
                               input=undefined */) {
    opts = opts || {};
    var ui = byCycle.UI;
    var form = opts.form || ui.route_form;
    var result_list = opts.result_list || ui.route_list;
    opts.processing_message = opts.processing_message || 'Finding route...';
    var service = 'routes';
    this.superclass.initialize.call(this, service, form, result_list, opts);
    this.ui.selectInputTab(service);
  },

  before: function() {
    this.superclass.before.call(this);
    var errors = [];
    if (typeof(this.input) == 'undefined') {
      // Use form fields for input
      var s = this.ui.s_el.value;
      var e = this.ui.e_el.value;
      if (!(s && e)) {
        if (!s) {
          errors.push('Please enter a start address');
          this.ui.s_el.focus();
        }
        if (!e) {
          errors.push('Please enter an end address');
          if (s) {
            this.ui.e_el.focus();
          }
        }
        throw new Error(errors.join('\n'));
      }
    }
  },

  on300: function(request) {
    this.superclass.on300.call(this, request);
    var route_choices = [];
    var addr;
    this.response.choices.each(function (c, i) {
      if (typeof c == 'Array') {
        addr = null;
      } else {
        if (c.number) {
          addr = [c.number, c.network_id].join('-');
        } else {
          addr = c.network_id
        }
      }
      route_choices[i] = addr;
    });
    this.route_choices = route_choices;
  },

  processResults: function(response, results) {
    var route, ls, s_e_markers, s_marker, e_marker, line;
    var ui = this.ui;
    var map = ui.map;
    var getBoundsForPoints = map.getBoundsForPoints.bind(map);
    var centerAndZoomToBounds = map.centerAndZoomToBounds.bind(map);
    var placeMarkers = map.placeMarkers.bind(map);
    var addListener = map.addListener.bind(map);
    var showMapBlowup = map.showMapBlowup.bind(map);
    var drawPolyLine;
    if (map.drawPolyLineFromEncodedPoints) {
      drawPolyLine = map.drawPolyLineFromEncodedPoints.bind(map);
    } else {
      drawPolyLine = map.drawPolyLine.bind(map);
    }
    results.each(function (r) {
      route = r.result;
      ls = route.linestring;

      // Zoom to linestring
      // TODO: Compute this in back end
      centerAndZoomToBounds(route.bounds, route.center);

      // Place from and to markers
      s_e_markers = placeMarkers([ls[0], ls[ls.length - 1]],
                                 [map.start_icon, map.end_icon]);

      // Add listeners to start and end markers
      s_marker = s_e_markers[0];
      e_marker = s_e_markers[1];
      addListener(s_marker, 'click', function() {
        showMapBlowup(ls[0]);
      });
      addListener(e_marker, 'click', function() {
        showMapBlowup(ls[ls.length - 1]);
      });

      // Draw linestring
      var line;
      var color = ui.route_line_color;
      if (map.drawPolyLineFromEncodedPoints) {
        line = drawPolyLine(route.google_points, route.google_levels, color);
      } else {
        line = drawPolyLine(ls, color);
      }

      // Add overlays to result object
      r.overlays.push(s_marker, e_marker, line);
    });
  }
});
