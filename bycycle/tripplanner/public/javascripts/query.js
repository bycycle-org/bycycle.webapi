/**
 * Query Base Class
 */
Class(app.ui, 'Query', null, {
  initialize: function(service, form, result_container,
                       opts /* input: null */) {
    if (arguments.length == 0) return;
    this.ui = app.ui;
    this.service = service;
    this.form = form;
    this.result_container = result_container;
    if (opts) {
      this.input = opts.input;
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
    this.ui.showSpinner();
  },

  doQuery: function() {
    // Done only if no errors in before()
    var path = [
      'regions', app.region_id, this.service, 'find.json'].join('/');
    var url = [app.prefix, path].join('');
    if (this.input) {
      url += util.objectToQueryString(this.input);
    } else {
      YAHOO.util.Connect.setForm(this.form.get('element'));
    }

    // TODO: Make bookmark???

    var self = this;
    var callback = {
      start: function () { self.onLoading.apply(self, arguments); },
      success: function () { self.on200.apply(self, arguments); },
      failure: function () { self.onFailure.apply(self, arguments); }
    };
    this.request = YAHOO.util.Connect.asyncRequest('GET', url, callback)
    var id = 'query-' + this.request.tId;
    this.ui.queries[id] = this;
    this.ui.query = this;
  },

  onLoading: function(response) {
    this.ui.showSpinner();
  },

  on200: function(response) {
    // Process the results for ``service``
    // I.e., recenter map, place markers, draw line, etc
    this.ui.hideSpinner();
    var result = YAHOO.lang.JSON.parse(response.responseText);
    this.result = result;
    var results = this.makeResults(result);
    this.processResults(response, results);
    this.ui.is_first_result = false;
  },

  onFailure: function(response) {
    this.ui.hideSpinner();
    var failure_method = this['on' + response.status]
    if (failure_method) {
      failure_method.call(this, response);
    } else {
      var result = YAHOO.lang.JSON.parse(response.responseText);
      this.result = result;
      this.ui.selectErrorTab(result.result.fragment);
    }
  },

  /**
   * Make a ``Result`` for each result in the response. Each ``Result``
   * contains an ID, result object, associated map overlays, widget reference,
   * etc.
   *
   * @param response The response object (responseText evaled)
   */
  makeResults: function(response_obj) {
    // Extract top level DOM nodes from response HTML fragment (skipping text
    // nodes). These nodes will be inserted as the content of each result's
    // widget.
    var div = document.createElement('div');
    div.innerHTML = response_obj.result.fragment;
    var nodes = div.getElementsByClassName('query-result');
    var dom_node, result, results = [];
    var response_results = response_obj.result.results;
    for (var i = 0, obj; i < response_results.length; ++i) {
      obj = response_results[i];
      dom_node = nodes[i];
      result = this.makeResult(obj, dom_node);
      results.push(result);
    }
    return results;
  },

  /**
   * Make a ``Result`` for the given (JSON) ``result`` and ``dom_node``.
   * The ``Result`` will contain an ID, JSON result object, associated map
   * overlays, widget reference, etc.
   *
   * @param result A simple object from the evaled JSON response
   * @param dom_node A DOM node that contains the necessary elements to create
   *        a result widget.
   * @return ``Result``
   */
  makeResult: function (result, dom_node) {
    var result_container = this.result_container;
    var results = this.ui.results;
    var service = this.service;

    var id = [service, 'result', new Date().getTime()].join('_');
    dom_node.id = id;

    var div = document.createElement('div');
    div.appendChild(dom_node);
    var num_tabs = result_container.get('tabs').length;
    var widget = new YAHOO.widget.Tab({
      label: '#' + num_tabs,
      content: div.innerHTML,
      active: true
    });
    result_container.addTab(widget);

    new YAHOO.widget.Button({
      id: id + '-close-button',
      type: 'button',
      label: 'X',
      container: id,
      onclick: {
        fn: function () {
          results[service][id].remove();
        }
      }
    });

    var result_obj = new this.ui.Result(id, result, service, widget, result_container);
    results[service][id] = result_obj;
    return result_obj;
  },

  processResults: function(response, results) {}
});


/**
 * Geocode Query
 */
Class(app.ui, 'GeocodeQuery', app.ui.Query, {
  initialize: function(opts /* form=app.ui.query_form,
                               result_container=app.ui.locations_container,
                               input=undefined */) {
    opts = opts || {};
    var ui = app.ui;
    var form = opts.form || ui.query_form;
    var result_container = opts.result_container || ui.locations_container;
    this.superclass.initialize.call(this, 'geocodes', form, result_container, opts);
  },

  before: function() {
    this.superclass.before.apply(this, arguments);
    if (typeof this.input == 'undefined') {
      var q = this.ui.q_el.get('value');
      if (!q) {
        this.ui.q_el.get('element').focus();
        throw new Error('Please enter an address!');
      }
    }
  },

  processResults: function(response, results) {
    // For each result, place a marker on the map.
    var zoom = this.ui.is_first_result ? this.ui.map.default_zoom : null;
    var self = this;
    var div, link, content_pane, marker;
    for (var i = 0, r; i < results.length; ++i) {
      r = results[i];
      div = document.getElementById(r.id);
      div = div.cloneNode(true);
      link = div.getElementsByClassName('show-on-map-link')[0];
      link.parentNode.removeChild(link);
      marker = self.ui.map.placeGeocodeMarker(r.result.point, div, zoom);
      r.addOverlay(marker, self.ui.map.locations_layer);
    }
  }
});


/**
 * Route Query
 */
Class(app.ui, 'RouteQuery', app.ui.Query, {
  initialize: function(opts /* form=app.ui.route_form,
                               result_container=app.ui.routes_container,
                               input=undefined */) {
    opts = opts || {};
    var ui = app.ui;
    var form = opts.form || ui.route_form;
    var result_container = opts.result_container || ui.routes_container;
    var service = 'routes';
    this.superclass.initialize.call(this, service, form, result_container, opts);
    this.ui.selectInputPane(service);
  },

  before: function() {
    this.superclass.before.apply(this, arguments);
    var errors = [];
    if (typeof this.input == 'undefined') {
      // Use form fields for input
      var s = this.ui.s_el.get('value');
      var e = this.ui.e_el.get('value');
      if (!(s && e)) {
        if (!s) {
          errors.push('Please enter a start address');
          this.ui.s_el.get('element').focus();
        }
        if (!e) {
          errors.push('Please enter an end address');
          if (s) {
            this.ui.e_el.get('element').focus();
          }
        }
        throw new Error(errors.join('\n'));
      }
    }
  },

  on300: function(response) {
    var result = YAHOO.lang.JSON.parse(response.responseText);
    this.result = result;
    this.ui.selectErrorTab(result.result.fragment);
    var addr;
    var route_choices = [];
    var choices = result.result.choices;
    for (var i = 0, c; i < choices.length; ++i) {
      c = choices[i];
      if (c.number) {
        addr = [c.number, c.network_id].join('-');
      } else {
        addr = c.network_id
      }
      route_choices.push(addr);
    }
    this.route_choices = route_choices;
  },

  processResults: function(response, results) {
    var route, ls, s_e_markers, s_marker, e_marker, line;
    var ui = this.ui;
    var map = ui.map;
    var drawPolyLine;
    if (map.drawPolyLineFromEncodedPoints) {
      drawPolyLine = map.drawPolyLineFromEncodedPoints;
    } else {
      drawPolyLine = map.drawPolyLine;
    }
    for (var i = 0, r; i < results.length; ++i) {
      r = results[i];
      route = r.result;
      ls = route.linestring;

      // Zoom to route extent
      map.centerAndZoomToBounds(route.bounds, route.center);

      // Place start and end markers
      s_e_markers = map.placeMarkers(
        [ls[0], ls[ls.length - 1]],
        [map.get_start_icon(), map.get_end_icon()]);
      s_marker = s_e_markers[0];
      e_marker = s_e_markers[1];

      // TODO: Doesn't work in OpenLayers (no equivalent to ``showMapBlowup``??
      map.addListener(s_marker, 'click', function() {
        var point = ls[0];
        map.setCenter(point, map.getZoom());
        map.showMapBlowup(point);
      });
      map.addListener(e_marker, 'click', function() {
        var point = ls[ls.length - 1];
        map.setCenter(point, map.getZoom());
        map.showMapBlowup(point);
      });

      // Draw linestring
      var line;
      var color = ui.route_line_color;
      if (map.drawPolyLineFromEncodedPoints) {
        line = drawPolyLine.call(
        map, route.google_points, route.google_levels, color);
      } else {
        line = drawPolyLine.call(map, ls, color);
      }

      // Add overlays to result object
      r.addOverlay(s_marker);
      r.addOverlay(e_marker);
      r.addOverlay(line);
    }
  }
});
