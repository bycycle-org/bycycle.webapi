byCycle.UI = {
  region_id: null,

  map: null,
  map_state: byCycle.getParamVal('map_state', function(mapState) {
    // Anything but '', '0' or 'off' is on
    return $.inArray(mapState, ['0', 'off', '']) === -1;
  }),
  map_type: (
    byCycle.map[byCycle.getParamVal('map_type').toLowerCase()] ||
    byCycle.map[byCycle.config.map_type] ||
    byCycle.map.base).Map,

  service: null,
  query: null,  // query.Query object (not query string)
  is_first_result: true,
  result: null,
  results: {geocode: {}, route: {}},
  http_status: null,
  response_text: null,

  status_messages: {
    200: 'One result was found',
    300: 'Multiple matches were found',
    400: 'Sorry, we were unable to understand your request',
    404: "Sorry, that wasn't found",
    500: 'Something unexpected happened'
  },

  route_line_color: '#000000',

  /* Initialization ********************************************************/

  setLoadingStatus: function(msg) {
    $('#loading-status').html(msg);
  },

  /**
   * Do stuff that must happen during page load
   */
  beforeLoad: function(props) {
    $('#spinner').show();
    this.setLoadingStatus('Loading...');

    $.extend(this, props);

    if (this.map_state) {
      this.map_type.prototype.beforeLoad();
    }

    $(document).ready(this.onLoad.bind(this));
  },

  /**
   * Do stuff that must happen once page has loaded
   */
  onLoad: function() {
    this._assignUIElements();
    this._createEventHandlers();
    this.map = new this.map_type(this, this.map_pane);
    this.setRegion(this.region_id);
    this.handleQuery();
    this.onResize();
    $('#loading-status').remove();
    this.spinner.hide();
  },

  _assignUIElements: function() {
    this.spinner = $('#spinner');
    this.status = $('#status');
    this.bookmark_link = $('#bookmark');

    this.query_form = $('#query_form');
    this.route_form = $('#route_form');
    this.q_el = $('#q');
    this.s_el = $('#s');
    this.e_el = $('#e');
    this.s_id_el = $('#s_id');
    this.e_id_el = $('#e_id');

    this.main_row = $('#main-row');
    this.result_pane = $('#results');
    this.map_pane = $('#map-pane');
  },

  /* Events ****************************************************************/

  _createEventHandlers: function () {
    $(window).on('resize', this.onResize.bind(this));
    $('#swap-s-and-e').on('click', this.swapStartAndEnd.bind(this));
    this.query_form.on('submit', this.runGenericQuery.bind(this));
    this.route_form.on('submit', this.runRouteQuery.bind(this));
    $('#clear-map-link').on('click', this.clearResults.bind(this));
  },

  onResize: function() {
    var bodyHeight = $(document.body).height(),
        offset = this.main_row.offset().top,
        height = bodyHeight - offset;
    $('#col-a').height(height);
    this.map.setHeight(height);
  },

  /* Display Panes *********************************************************/

  showContent: function (content) {
    this.result_pane.html(content);
  },

  /* Regions ***************************************************************/

  setRegionFromSelectBox: function() {
    this.setRegion(this.region_el.val());
  },

  setRegion: function(region_id) {
    this.region_id = region_id;
    var regions = byCycle.regions.regions;
    var region = regions[region_id];
    if (region) {
      // Zoom to a specific region
      this.map.centerAndZoomToBounds(region.bounds, region.center);
      this._showRegionOverlays(region);
    } else {
      // Show all regions
      var all_regions = byCycle.regions;
      this.map.centerAndZoomToBounds(all_regions.bounds, all_regions.center);
      regions.values().each(function (r) {
        this._showRegionOverlays(r);
      });
    }
  },

  // Show map overlays for a region, creating and caching them first if
  // necessary
  _showRegionOverlays: function(region, use_cached) {
    if (!this.region_id && !region.marker) {
      region.marker = this.map.makeRegionMarker(region);
    } else if (use_cached) {
      this.map.addOverlay(region.marker);
    }
    if (!region.line) {
      region.line = this.map.drawPolyLine(region.linestring);
    } else if (use_cached) {
      this.map.addOverlay(region.line);
    }
  },

  /* Services Input ********************************************************/

  focusServiceElement: function (service) {
    service == 'route' ? this.s_el.focus() : this.q_el.focus();
  },

  selectInputTab: function (service) {
    if (service === 'route') {
      $('#find-route-tab a:first').tab('show');
    } else {
      $('#search-map-tab a:first').tab('show');
    }
  },

  swapStartAndEnd: function(event) {
    var s = this.s_el.val();
    this.s_el.val(this.e_el.val());
    this.e_el.val(s);
  },

  setAsStart: function(addr) {
    this.s_el.val(addr);
    this.selectInputTab('route');
    this.s_el.focus();
  },

  setAsEnd: function(addr) {
    this.e_el.val(addr);
    this.selectInputTab('route');
    this.e_el.focus();
  },

  /* Query-related *********************************************************/

  // This is run on page load only. The purpose is to simulate an AJAX
  // query (i.e., the post-processing that happens).
  handleQuery: function() {
    if (!this.jsonData) {
      return;
    }
    var status = this.http_status,
        queryClassName = [
          this.service.charAt(0).toUpperCase(), this.service.substr(1),
          'Query'].join(''),
        queryClass = byCycle.UI[queryClassName],
        queryObj = new queryClass();
    this.request = {responseJSON: this.jsonData};
    if (status === 200 || status === 300) {
      queryObj['on' + status](this.request);
    } else {
      queryObj.onFailure(this.request);
    }
    this.query = queryObj;
  },

  runGenericQuery: function(event, input /* =undefined */) {
    if (event) {
      event.preventDefault();
    }
    var q = input || this.q_el.val();
    if (q) {
      var query_class,
          waypoints = q.toLowerCase().split(' to ');
      if (waypoints.length > 1) {
        this.s_el.val(waypoints[0]);
        this.e_el.val(waypoints[1]);
        query_class = byCycle.UI.RouteQuery;
      } else {
        query_class = byCycle.UI.GeocodeQuery;
      }
      this.runQuery(query_class, event, input);
    } else {
      this.q_el.focus();
      this.showErrors(['Please enter something to search for!']);
    }
  },

  /* Run all queries through here for consistency. */
  runQuery: function(query_class,
                     event /* =undefined */,
                     input /* =undefined */) {
    if (event) {
      event.preventDefault();
    }
    if (input && typeof input.region === 'undefined') {
      input.region = this.region_id;
    }
    this.query = new query_class({input: input});
    this.query.run();
  },

  runGeocodeQuery: function(event, input) {
    this.runQuery(byCycle.UI.GeocodeQuery, event, input);
  },

  runRouteQuery: function(event, input) {
    this.runQuery(byCycle.UI.RouteQuery, event, input);
  },

  showErrors: function(errors) {
    this.status.html('Oops!');
    this.spinner.hide();
    var content = [];
    $.each(errors, function (i, error) {
      content.push('<div class="alert alert-danger">', error, '</div>');
    });
    content = content.join(''),
    this.showContent(content);
  },

  /**
   * Select from multiple matching geocodes
   */
  selectGeocode: function(select_link, i) {
    var data = this.query.request.responseJSON,
        result = this.query.makeResult(data.results[i]);
        panel = $(select_link).closest('.panel');
    this.query.processResults([result]);
    this.showContent(panel.clone().wrap('<div>').parent().html());
    $('.set-as-s-or-e').show();
    if (this.is_first_result) {
      this.map.setZoom(this.map.default_zoom);
    } else {
      this.is_first_result = false;
    }
  },

  /**
   * Select from multiple matching geocodes for a route
   */
  selectRouteGeocode: function(select_link, choice) {
    var route_choices = this.query.route_choices,
        container = $(select_link).closest('.route-choice'),
        next = container.next('.route-choice'),
        addr;
    if (choice.number) {
      addr = [choice.number, choice.network_id].join('-');
    } else {
      addr = choice.network_id
    }
    $.each(route_choices, function (i, v) {
      if (v === null) {
        route_choices[i] = addr;
        return false;
      }
    })
    container.remove();
    if (next.length) {
      next.show();
    } else {
      this.runRouteQuery(null, {
        q: this.query.route_choices.join(' to ')
      });
    }
  },

  clearResults: function (event) {
    if (event) {
      event.preventDefault();
    }
    if (confirm('Remove all of your results and clear the map?')) {
      $.each(this.results, function (service, results) {
        $.each(results, function (id, result) {
          result.remove();
          delete results[id];
        })
      });
      this.showContent('');
    }
  },

  reverseDirections: function (s, e) {
    this.s_el.val(s);
    this.e_el.val(e);
    new byCycle.UI.RouteQuery(this.route_form).run();
  }
};
