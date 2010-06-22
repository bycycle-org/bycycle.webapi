/* Augments the base UI namespace */
(function () {
  var self = byCycle.UI;

  // Save old versions of UI functions
  var onLoad = self.onLoad;
  var _assignUIElements = self._assignUIElements;
  var _createEventHandlers = self._createEventHandlers;

  Object.extend(self, {
    service: 'services',
    query: null,  // query.Query object (not query string)
    is_first_result: true,
    result: null,
    results: $H({'geocodes': $H({}), 'routes': $H({})}),
    http_status: null,
    response_text: null,
    bike_overlay: null,
    bike_overlay_state: false,

    status_messages: {
      200: 'One result was found',
      300: 'Multiple matches were found',
      400: 'Sorry, we were unable to understand your request',
      404: "Sorry, that wasn't found",
      500: 'Something unexpected happened'
    },

    route_line_color: '#000000',

    /* BEGIN Functions that replace functions in byCycle.UI */

    onLoad: function () {
      onLoad();
      var w = byCycle.widget.TabControl;
      var initial_tab_id = (self.service == 'routes' ? 'find-a-route' :
                            'search-the-map');
      self.input_tab_control = new w(self.input_container, initial_tab_id);
      initial_tab_id = (self.service == 'routes' ? 'routes' : 'locations');
      self.result_tab_control = new w(self.result_pane, initial_tab_id,
                                      initial_tab_id);
      self.handleQuery();
      self.onResize();
      if (byCycle.getParamVal('bike_map')) {
        self.toggleBikeTileOverlay();
      }
      self.map_buttons = self.map_buttons.remove();
      self.map_pane.appendChild(self.map_buttons);
    },

    _assignUIElements: function() {
      _assignUIElements();
      self.input_container = $('input_container');
      self.query_pane = $('search-the-map');
      self.route_pane = $('find-a-route');
      self.query_form = $('query_form');
      self.route_form = $('route_form');
      self.q_el = $('q');
      self.s_el = $('s');
      self.e_el = $('e');
      self.pref_el = $('pref');
      self.location_list = $('location_list');
      self.route_list = $('route_list');
      self.bike_overlay_link = $('bike-overlay-link');
      self.map_buttons = $('map-buttons');
      self.legend_button = $('legend-map-button');
    },

    _createEventHandlers: function () {
      _createEventHandlers();
      Event.observe('swap_s_and_e', 'click', self.swapStartAndEnd);
      Event.observe(self.query_form, 'submit', self.runGenericQuery);
      Event.observe(self.route_form, 'submit', self.runRouteQuery);
      Event.observe($('clear-map-link'), 'click', self.clearResults);
      Event.observe($('find-at-center-link'), 'click',
                    self.identifyIntersectionAtCenter);
      Event.observe($('cm-find-at-center-link'), 'click',
                    self.identifyIntersectionAtCenter);
      Event.observe($('cm-set-as-start'), 'click', function (event) {
        Event.stop(event);
        self.setAsStart(byCycle.UI.map.getCenterString());
      });
      Event.observe($('cm-set-as-end'), 'click', function (event) {
        Event.stop(event);
        self.setAsEnd(byCycle.UI.map.getCenterString());
      });
      if (self.bike_overlay_link) {
        Event.observe(self.bike_overlay_link, 'click',
                      self.toggleBikeTileOverlay);
      }
      Event.observe(self.legend_button, 'click', function (event) {
        var url = '/static/regions/' + self.region_id + '/map_legend_popup.html';
        var w = window.open(url, 'bike_map_legend_window', 'status=0,toolbar=0,scrollbars=1,location=0,menubar=0,directories=0,width=755,height=490,left=0,top=0');
      });
    },

    showResultPane: function(list_pane) {
      list_pane = list_pane || self.location_list;
      self.message_pane.hide();
      self.result_tab_control.select_by_id(list_pane.parentNode.id)
      self.result_pane.show();
    },

    /* END Functions that replace functions in byCycle.UI */


    /* Services Input ********************************************************/

    focusServiceElement: function(service) {
      service == 'route' ? self.s_el.focus() : self.q_el.focus();
    },

    selectInputTab: function(service) {
      self.input_tab_control.select(service == 'routes' ? 1 : 0);
    },

    swapStartAndEnd: function(event) {
      event && Event.stop(event);
      var s = self.s_el.value;
      self.s_el.value = self.e_el.value;
      self.e_el.value = s;
    },

    setAsStart: function(addr) {
      self.s_el.value = addr;
      self.selectInputTab('routes');
      self.s_el.focus();
    },

    setAsEnd: function(addr) {
      self.e_el.value = addr;
      self.selectInputTab('routes');
      self.e_el.focus();
    },

    /* Query-related *********************************************************/

    handleQuery: function() {
      if (!self.http_status) { return; }
      var res = self.member_name;

      // E.g., query_class := GeocodeQuery
      var query_class = [res.charAt(0).toUpperCase(), res.substr(1),
                         'Query'].join('');
      query_class = self[query_class];

      var query_obj = new query_class();
      if (self.http_status == 200) {
        var pane = $(self.collection_name == 'routes' ? 'routes' : 'locations');
        var fragment = pane.getElementsByClassName('fragment')[0];
        var json = fragment.getElementsByClassName('json')[0];
        var request = {status: self.http_status, responseText: $F(json)};
        Element.remove(fragment);
        Element.remove(json);
        query_obj.on200(request);
      } else if (self.http_status == 300) {
        var json = self.error_pane.getElementsByClassName('json')[0];
        var request = {status: self.http_status, responseText: $F(json)};
        Element.remove(json);
        query_obj.on300(request);
      }
      self.query = query_obj;
    },

    runGenericQuery: function(event, input /* =undefined */) {
      byCycle.logDebug('Entered runGenericQuery...');
      var q = input || self.q_el.value;
      if (q) {
        var query_class;
        // Is the query a route?
        var waypoints = q.toLowerCase().split(' to ');
        byCycle.logDebug(waypoints);
        if (waypoints.length > 1) {
          // Query looks like a route
          self.s_el.value = waypoints[0];
          self.e_el.value = waypoints[1];
          // Override using ``s`` and ``e``
          var input = {q: q};
          query_class = self.RouteQuery;
        } else {
          // Query doesn't look like a route; default to geocode query
          query_class = self.GeocodeQuery;
        }
        self.runQuery(query_class, event, input);
      } else {
        event && Event.stop(event);
        self.q_el.focus();
        self.showErrors('Please enter something to search for!');
      }
      byCycle.logDebug('Left runGenericQuery');
    },

    /* Run all queries through here for consistency. */
    runQuery: function(query_class,
                       event /* =undefined */,
                       input /* =undefined */) {
      event && Event.stop(event);
      self.query = new query_class({input: input});
      self.query.run();
    },

    runGeocodeQuery: function(event, input) {
      self.runQuery(self.GeocodeQuery, event, input);
    },

    runRouteQuery: function(event, input) {
      self.runQuery(self.RouteQuery, event, input);
    },

    showErrors: function(/* args */) {
      var errors = $A(arguments);
      self.status.innerHTML = 'Oops!';
      self.spinner.hide();
      var content = ['<h2>Error', (errors.length == 1 ? '' : 's'), '</h2>',
                     '<div class="errors">',
                       '<p class="error">',
                          errors.join('</p><p class="error">'),
                       '</p>',
                     '</div>'].join('');
      self.showMessagePane(self.error_pane, content);
    },

    /**
     * Select from multiple matching geocodes
     */
    selectGeocode: function(select_link, i) {
      byCycle.logDebug('Entered selectGeocode...');
      var response = self.query.response;
      var dom_node = $(select_link).up('.fixed-pane');
      var result = self.query.makeResult(response.results[i], dom_node);
      self.query.processResults('', [result])

      // Remove the selected result's selection links ("show on map" & "select")
      Element.remove(select_link.parentNode);

      // Show the title bar and "set as start or end" links
      dom_node.getElementsByClassName('title-bar')[0].show();
      dom_node.getElementsByClassName('set_as_s_or_e')[0].show();

      // Append the widget to the list of locations
      var li = document.createElement('li');
      li.appendChild(dom_node);
      this.location_list.appendChild(li);

      self.showResultPane(self.location_list);
      self.status.update('Added location to locations list.');
      
      if (self.is_first_result) {
        self.map.setZoom(self.map.default_zoom);
      } else {
        self.is_first_result = false;
      }

      byCycle.logDebug('Left selectGeocode.');
    },

    /**
     * Select from multiple matching geocodes for a route
     */
    selectRouteGeocode: function(select_link, i, j) {
      byCycle.logDebug('Entered selectRouteGeocode...');
      var dom_node = $(select_link).up('ul');
      var next = dom_node.next();
      var choice = self.query.response.choices[i][j];
      var addr;
      if (choice.number) {
        addr = [choice.number, choice.network_id].join('-');
      } else {
        addr = choice.network_id
      }
      self.query.route_choices[i] = addr;
      dom_node.remove();
      if (next) {
        next.show();
      } else {
        self.runRouteQuery(null, {q: self.query.route_choices.join(' to ')});
      }
    },

    removeResult: function(result_el) {
      try {
        self.results[result_el.id].remove();
      } catch (e) {
        if (e instanceof TypeError) {
          // result_el wasn't registered as a `Result` (hopefully intentionally)
          Element.remove(result_el);
        } else {
          byCycle.logDebug('Unhandled Exception in byCycle.UI.removeResult: ',
                           e.name, e.message);
        }
      }
    },

    clearResults: function(event) {
      event && Event.stop(event);
      if (!confirm('Remove all of your results and clear the map?')) {
        return;
      }
      self.results.values().each(function (service_results) {
        service_results.values().each(function (result) {
          service_results[result.id].remove();
        });
      });
    },

    reverseDirections: function(s, e) {
      self.s_el.value = s;
      self.e_el.value = e;
      new self.RouteQuery(self.route_form).run();
    },


    /* Map *******************************************************************/

    identifyIntersectionAtCenter: function(event) {
      byCycle.logDebug('In find-intersection-at-center callback');
      var center = self.map.getCenter();
      self.q_el.value = self.map.getCenterString();
      self.identifyIntersection(center, event);
    },

    handleMapClick: function(point, event) {
      var handler = self[$('map_mode').value];
      if (typeof(handler) != 'undefined') {
        handler(point);
      }
    },

    identifyIntersection: function(point, event) {
      self.runGeocodeQuery(event, {q: [point.x, point.y].join()});
    },

    identifyStreet: function(point, event) {
      self.status.innerHTML = '"Identify Street" feature not implemented yet.';
    },

    toggleBikeTileOverlay: function (event) {
      event && Event.stop(event);
      if (self.bike_overlay_state) {
        // Bike layer was on; turn it off
        self.map.removeOverlay(self.bike_overlay);
        Element.hide('map-buttons');
        self.bike_overlay_link.value = 'Show bike map';
      } else {
        // Bike layer was off; turn it on
        self.bike_overlay = self.map.makeBikeTileOverlay(20);
        self.map.addOverlay(self.bike_overlay);
        Element.show('map-buttons');
        self.bike_overlay_link.value = 'Hide bike map';
        if (self.map.getZoom() < 9) { self.map.setZoom(9); }
        self.bike_overlay.show();
      }
      self.bike_overlay_state = !self.bike_overlay_state;
    }
  });
})();
