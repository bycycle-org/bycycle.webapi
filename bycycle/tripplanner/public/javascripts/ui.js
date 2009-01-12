/** Namespace for User Interface objects and functions.
 *
 */
NameSpace('ui', app, function () {
  var Element = Ext.Element;
  var Panel = Ext.Panel;

  return {
    region_id: null,
    region: null,
    in_region: false,

    map: null,
    map_pane_id: 'map_pane',

    service: null,
    query: null,  // query.Query object (not query string)
    queries: {},
    is_first_result: true,
    result: null,
    results: {'geocodes': {}, 'routes': {}},
    http_status: null,

    status_messages: {
      200: 'One result was found',
      300: 'Multiple matches were found',
      400: 'Sorry, we were unable to understand your request',
      404: "Sorry, that wasn't found",
      500: 'Something unexpected happened'
    },

    route_line_color: '#000000',


    /* Initialization ********************************************************/

    /**
     * Do stuff that must happen once page has loaded
     */
    initialize: function() {
      this.region_id = app.region_id;
      this.region = app.region;
      this.in_region = (this.region_id != 'all');

      this._assignUIElements();
      this.layout = this._createLayout();
      //this._createWidgets();

      // If map is "on" and specified map type is loadable, use that map type.
      // Otherwise, use the default map type (base).
      //if (!(this.map_state && this.map_type.isLoadable())) {
        //this.map_type = app.Map.base;
      //}
      //this.map = new this.map_type.Map(this, this.map_pane_id);

      //if (this.region_id == 'all') {
        //this.setRegion(this.region_id);
        //var region, regions = app.regions.regions;
        //for (var slug in regions) {
          //region = app.regions.regions[slug];
          //geom = region.geometry['4326'];
          //this.map.makeRegionMarker(region.slug, geom.center);
          //this.map.drawPolyLine(geom.linestring);
        //}
      //} else {
        //this.map.drawPolyLine(this.region.geometry.linestring);
      //}

      //this._createEventHandlers();

      //var zoom = parseInt(util.getParamVal('zoom'), 10);
      //if (!isNaN(zoom)) {
        //this.map.setZoom(zoom);
      //}

      //this.handleQuery();

      //this.selectInputPane(this.service);
      this.hideSpinner();
      Ext.fly('loading_panel').remove();
    },

    _assignUIElements: function () {
      if (!this.in_region) {
        this.region_el = document.getElementById('regions');
      }
      // Common
      this.spinner = new Element('spinner');
      this.controls = new Element('controls');
      // Service/query related
      if (this.in_region) {
        this.query_pane = new Element('search-the-map');
        this.route_pane = new Element('find-a-route');
        this.query_form = new Element('query_form');
        this.route_form = new Element('route_form');
        this.q_el = new Element('q');
        this.s_el = new Element('s');
        this.e_el = new Element('e');
        this.pref_el = new Element('pref');
      }
    },

    _createLayout: function () {
      var layout = new Ext.Viewport({
        layout: 'border',
        renderTo: document.body,
        height: '100%',
        items: [
          {
            region: 'north',
            contentEl: 'top',
            autoHeight: true
          },
          {
            region: 'west',
            contentEl: 'left',
            layout: 'card',
            width: 300,
            split: true
          },
          {
            region: 'center',
            contentEl: 'center'
          },
          {
            region: 'east',
            contentEl: 'right',
            width: 120
          },
        ]
      });

      layout.render()
      return layout;
    },

    _createWidgets: function () {
      var panels = []

      if (this.in_region) {
        // Containers for location and route results
        this.locations_container = new Panel('locations', {
          visible: true,
          close: false,
          draggable: false,
          underlay: 'none'
        });
        panels.push(this.locations_container);
        this.locations_container.render();

        this.routes_container = new Panel('routes', {
          visible: true,
          close: false,
          draggable: false,
          underlay: 'none'
        });
        panels.push(this.routes_container);
        this.routes_container.render();
      } else {
        var regions_panel = new Panel('select-region', {
          visible: true,
          close: false,
          draggable: false,
          underlay: 'none'
        });
        panels.push(regions_panel);
        regions_panel.render();
      }

      var panel_ids = [
        'about-bycycle',
        'support-bycycle',
        'contact-bycycle',
        'oops',
      ];

      for (var i = 0, panel_id, panel; i < panel_ids.length; ++i) {
        panel_id = panel_ids[i];
        panel = new Panel(panel_id, {
          visible: false,
          draggable: false,
          underlay: 'none'
        });
        panels.push(panel);
        panel.render();
      }

      this.controls = new YAHOO.widget.OverlayManager();
      this.controls.register(panels);

      // Dialog for info and errors
      var alert_panel = new YAHOO.widget.SimpleDialog('alert_panel', {
        fixedcenter: true,
        visible: false,
        modal: true,
        width: '400px',
        constraintoviewport: true,
        icon: YAHOO.widget.SimpleDialog.ICON_WARN,
        buttons: [
          {
            text: 'OK', handler: function() { alert_panel.hide(); },
            isDefault: true
          }
        ]
      });
      alert_panel.setHeader('Alert');
      alert_panel.setBody('...');
      alert_panel.render(document.body);
      this.alert_panel = alert_panel;
    },

    /* Events ****************************************************************/

    _createEventHandlers: function () {
      document.body.onunload = this.onUnload;
      if (this.region_el) {
        // KLUDGE: Why doesn't YUI's on('change') work here?!?!?!
        this.region_el.onchange = this.setRegionFromSelectBox;
      }
      this.spinner.on('click', function (event) {
        this.hideSpinner();
      }, this, true);
      // Services
      if (this.in_region) {
        Event.addListener('swap_s_and_e', 'click', this.swapStartAndEnd, true);
        Event.addListener('query_form_button', 'click', this.runGenericQuery, true);
        Event.addListener('route_form_button', 'click', this.runRouteQuery, true);
      }
    },

    onUnload: function (event) {
      this.map.onUnload();
    },

    handleMapClick: function (event) {},

    stopEvent: function (event) {
      if (event) {
        Event.stopEvent(event);
      }
    },


    /* UI ********************************************************************/

    showSpinner: function () {
      this.spinner.setStyle('display', 'block');
    },

    hideSpinner: function () {
      this.spinner.setStyle('display', 'none');
    },

    /**
     * @param errors An Array of error messages or a string of error messages
     *        separated by a newline.
     */
    showErrors: function(errors) {
      if (typeof errors == 'string') {
        errors = errors.split('\n');
      }
      var e, lis = [], row_class = 'a';
      for (var i = 0; i < errors.length; ++i) {
        e = errors[i];
        lis = lis.concat(['<li class="error ', row_class, '">', e, '</li>']);
        row_class = (row_class == 'a' ? 'b' : 'a');
      }
      var content = ['<ul class="errors">', lis.join(''), '</ul>'].join('');
      this.showAlertPanel('Oops!', content, 'error');
      this.hideSpinner();
    },

    showException: function(content) {
      this.showAlertPanel('Achtung!', content, 'error');
      this.hideSpinner();
    },

    showAlertPanel: function (title, content, icon_type) {
      var icon;
      if (typeof icon_type == 'undefined') {
        icon_type = 'warn';
      }
      var icon_types = {
        info: YAHOO.widget.SimpleDialog.ICON_INFO,
        warn: YAHOO.widget.SimpleDialog.ICON_WARN,
        error: YAHOO.widget.SimpleDialog.ICON_ALARM,
        alarm: YAHOO.widget.SimpleDialog.ICON_ALARM,
        help: YAHOO.widget.SimpleDialog.ICON_HELP
      }
      var icon = icon_types[icon_type];
      this.alert_panel.setHeader(title);
      this.alert_panel.setBody(content);
      this.alert_panel.cfg.setProperty('icon', icon);
      this.alert_panel.show();
    },

    getErrorTab: function () {
      var tabview = this.controls;
      return tabview.getTab(tabview.get('tabs').length - 1);
    },

    selectErrorTab: function (content) {
      var tab = this.getErrorTab();
      if (content) {
        tab.set('content', content);
      }
      this.controls.set('activeTab', tab);
    },


    /* Regions ***************************************************************/

    setRegionFromSelectBox: function() {
      var el = this.region_el;
      var val = el.options[el.selectedIndex].value;
      this.setRegion(val);
    },

    setRegion: function(region_id) {
      // This is only meant to be used on /regions page; that's why it uses
      // degrees instead of the region's native units.
      var region = app.regions.regions[region_id];
      if (!region) {
        region = app.regions.all;
      }
      var geom = region.geometry['4326'];
      this.map.centerAndZoomToBounds(geom.bounds, geom.center);
    },


    /* Services Input ********************************************************/

    focusServiceElement: function(service) {
      var el = (service == 'route' ? this.s_el : this.q_el);
      el.get('element').focus();
    },

    selectInputPane: function(service) {
      if (this.http_status && this.http_status != 200) {
        this.selectErrorTab();
      } else if (this.in_region) {
        //this.controls.set('activeIndex', (service == 'routes' ? 1 : 0));
      }
    },

    swapStartAndEnd: function(event) {
      this.stopEvent(event);
      var s = this.s_el.get('value');
      this.s_el.set('value', this.e_el.get('value'));
      this.e_el.set('value', s);
    },

    setAsStart: function(addr) {
      this.s_el.set('value', addr);
      this.selectInputPane('routes');
      this.s_el.get('element').focus();
    },

    setAsEnd: function(addr) {
      this.e_el.set('value', addr);
      this.selectInputPane('routes');
      this.e_el.get('element').focus();
    },


    /* Query-related *********************************************************/

    handleQuery: function() {
      var status = this.http_status;
      if (!status) { return; }
      if (status != 200 && status != 300) { return; }

      var res = this.member_name;

      // E.g., query_class := GeocodeQuery
      var query_class = [
        res.charAt(0).toUpperCase(), res.substr(1), 'Query'].join('');
      query_class = this[query_class];

      var query_obj = new query_class();

      var pane = app.el(
        this.collection_name == 'routes' ? 'routes' : 'locations');
      var json = pane.getElementsByClassName('json')[0];
      var request = {status: this.http_status, responseText: json.value};

      if (this.http_status == 200) {
        var fragment = pane.getElementsByClassName('query-result')[0];
        fragment.parentNode.removeChild(fragment);
        query_obj.on200(request);
      } else if (this.http_status == 300) {
        var fn = query_obj.on300 || query_obj.onFailure;
        fn.call(query_obj, request);
      }

      json.parentNode.removeChild(json);
      this.query = query_obj;
    },

    runGenericQuery: function(event, self, input /* =undefined */) {
      this.stopEvent(event);
      var q = input || this.q_el.get('value');
      if (q) {
        var query_class;
        // Is the query a route?
        var waypoints = q.toLowerCase().split(' to ');
        if (waypoints.length > 1) {
          // Query looks like a route
          this.s_el.set('value', waypoints[0]);
          this.e_el.set('value', waypoints[1]);
          // Override using ``s`` and ``e``
          query_class = this.RouteQuery;
        } else {
          // Query doesn't look like a route; default to geocode query
          query_class = this.GeocodeQuery;
        }
        this.runQuery(query_class, event, input);
      } else {
        this.showErrors('Please enter something to search for!');
        // TODO: Make this work--error dialog appears to grab focus.
        this.q_el.get('element').focus();
      }
    },

    /* Run all queries through here for consistency. */
    runQuery: function(query_class,
      event /* =undefined */,
      input /* =undefined */) {
      this.stopEvent(event);
      this.query = new query_class({input: input});
      this.query.run();
    },

    runGeocodeQuery: function(event, input) {
      this.runQuery(this.GeocodeQuery, event, input);
    },

    runRouteQuery: function(event, self, input) {
      this.runQuery(this.RouteQuery, event, input);
    },

    /** Select from multiple matching geocodes
     *
     */
    selectGeocode: function(select_link, i) {
      var query_result = this.query.result;

      var dom_node = Dom.getAncestorByClassName(select_link, 'query-result');

      // Remove the selected result's "select link
      var span = dom_node.getElementsByClassName('select-geocode-span')[0];
      span.parentNode.removeChild(span);

      //// Show the "set as start or end" link
      var link = dom_node.getElementsByClassName('set_as_s_or_e')[0];
      link = new Element(link);
      link.setStyle('display', 'block');

      var result = this.query.makeResult(query_result.result.results[i], dom_node);
      this.query.processResults('', [result])

      this.selectInputPane('geocodes');
      dom_node.parentNode.removeChild(dom_node);

      if (this.is_first_result) {
        this.map.setZoom(this.map.default_zoom);
      } else {
        this.is_first_result = false;
      }
    },

    /** Select from multiple matching geocodes for a route
     *
     */
    selectRouteGeocode: function(select_link, i, j) {
      var query_result = this.query.result;
      var dom_node = Dom.getAncestorByTagName(select_link, 'ul');
      var next = Dom.getNextSibling(dom_node);
      var choice = query_result.result.choices[i][j];
      var addr;
      if (choice.number) {
        addr = [choice.number, choice.network_id].join('-');
      } else {
        addr = choice.network_id;
      }
      this.query.route_choices[i] = addr;
      dom_node.parentNode.removeChild(dom_node);
      if (next) {
        next = new Element(next);
        next.setStyle('display', 'block');
      } else {
        this.runRouteQuery(null, this, {q: this.query.route_choices.join(' to ')});
      }
    },

    clearResults: function(event) {
      this.stopEvent(event);
      if (!confirm('Remove all of your results and clear the map?')) {
        return;
      }
      var results = this.results;
      var service_results, result;
      for (var service in results) {
        service_results = results[service];
        for (var i = 0; i < service_results.length; ++i) {
          result = service_results[i];
          result.remove();
        }
      }
    },

    reverseDirections: function(s, e) {
      this.s_el.set('value', s);
      this.e_el.set('value', e);
      new this.RouteQuery(this.route_form).run();
    },


    /* Map *******************************************************************/

    identifyIntersectionAtCenter: function(event) {
      var center = this.map.getCenter();
      this.q_el.set('value', this.map.getCenterString());
      this.identifyIntersection(center, event);
    },

    handleMapClick: function(point, event) {
      //
    },

    identifyIntersection: function(point, event) {
      this.runGeocodeQuery(event, {q: [point.x, point.y].join(',')});
    }
  };
}());
