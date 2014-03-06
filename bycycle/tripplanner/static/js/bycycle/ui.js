define([
  'jquery',
  'bycycle',
  'bycycle/map',
  'bycycle/query',
  'bycycle/regions',
  'bycycle/result'
], function (
  $,
  bycycle,
  map,
  query,
  regions,
  result
) {

  var Route = result.Route;

  byCycle.UI = {
    regionId: null,
    service: null,
    query: null,  // query.Query object (not query string)
    isFirstResult: true,
    results: {},

    statusMessages: {
      200: 'One result was found',
      300: 'Multiple matches were found',
      400: 'Sorry, we were unable to understand your request',
      404: "Sorry, that wasn't found",
      500: 'Something unexpected happened'
    },

    init: function (config) {
      $.extend(this, config);
      $('#spinner').show();
      $('#status').show().html('Loading...');
      $(document).ready(function () {
        var zoom = bycycle.getParamVal('zoom', parseInt);

        this.region = regions.regions[this.regionId];

        this.assignUIElements();
        this.createEventHandlers();
        this.onResize();

        this.map = new map.Map({target: 'map-pane'});
        this.mapContextMenu = new map.MapContextMenu(this, this.map);

        this.setRegion(this.regionId);
        this.handleQuery();

        if (typeof zoom !== 'undefined') {
          this.map.getView().setZoom(zoom)
        }

        this.clearStatus();
        this.spinner.hide();
      }.bind(this));
    },

    assignUIElements: function () {
      this.queryForm = $('#query-form');
      this.routeForm = $('#route-form');
      this.queryEl = $('#q');
      this.queryId = $('#q-id')
      this.startEl = $('#s');
      this.startId = $('#s-id')
      this.endId = $('#e-id')
      this.endEl = $('#e');
      this.status = $('#status');
      this.bookmarkLink = $('#bookmark');
      this.mainRow = $('#main-row');
      this.colA = $('#col-a');
      this.colB = $('#col-b');
      this.resultPane = $('#results');
      this.spinner = $('#spinner');
    },

    createEventHandlers: function () {
      $(window).on('resize', this.onResize.bind(this));

      $('#old-news-link').on('click', function () {
        $('#old-news').toggle();
      });

      this.queryEl.change(function () {
        this.queryId.val('');
      }.bind(this));

      this.startEl.change(function () {
        this.startId.val('');
      }.bind(this));

      this.endEl.change(function () {
        this.endId.val('');
      }.bind(this));

      this.queryForm.on('submit', function (event) {
        event.preventDefault();
        this.runGenericQuery();
      }.bind(this));

      this.routeForm.on('submit', function (event) {
        event.preventDefault();
        this.runRouteQuery();
      }.bind(this));

      var input_dropdown = $('#input-dropdown');

      input_dropdown.on('hide.bs.dropdown', function () {
        var selected = input_dropdown.find('li.active a span');
        $('#selected-input').removeClass().addClass(selected.attr('class'));
      });

      $('#swap-s-and-e').on('click', this.swapStartAndEnd.bind(this));

      $('#clear-results').on('click', function (event) {
        event.preventDefault();
        this.removeResults();
      }.bind(this));
    },

    onResize: function () {
      var bodyHeight = $(document.body).height(),
          offset = this.mainRow.offset().top,
          height = bodyHeight - offset;
      this.colA.height(height);
      this.colB.height(height);
    },

    showContent: function (content) {
      this.resultPane.html(content);
    },

    setRegion: function (regionId) {
      this.regionId = regionId;
      var region = regions.regions[regionId],
          bounds = region ? region.bounds : regions.bounds;
      bounds = this.map.transformBounds(bounds);
      this.map.getView().fitExtent(bounds, this.map.getSize());
    },

    /* Services Input ********************************************************/

    setQuery: function (val, id) {
      this.queryEl.val(val);
      this.queryId.val(id || '');
    },

    setStart: function (val, id) {
      this.startEl.val(val);
      this.startId.val(id || '');
    },

    setEnd: function (val, id) {
      this.endEl.val(val);
      this.endId.val(id || '');
    },

    selectInputTab: function (service) {
      if (service === 'route') {
        $('#get-directions-tab a:first').tab('show');
      } else {
        $('#search-map-tab a:first').tab('show');
      }
    },

    swapStartAndEnd: function () {
      var s = this.startEl.val(),
          sId = this.startId.val();
      this.setStart(this.endEl.val(), this.endId.val());
      this.setEnd(s, sId)
    },

    setAsStart: function (addr, id) {
      this.setStart(addr, id);
      this.selectInputTab('route');
      this.startEl.focus();
    },

    setAsEnd: function (addr, id) {
      this.setEnd(addr, id);
      this.selectInputTab('route');
      this.endEl.focus();
    },

    /* Query-related *********************************************************/

    // This is run on page load only. The purpose is to simulate an AJAX
    // query (i.e., the post-processing that happens).
    handleQuery: function () {
      if (!bycycle.jsonData) {
        return;
      }
      var jsonData = bycycle.jsonData,
          status = bycycle.httpStatus,
          queryClassName = [
            this.service.charAt(0).toUpperCase(), this.service.substr(1),
            'Query'].join(''),
          queryClass = query[queryClassName],
          queryObj = new queryClass(this),
          request = {responseJSON: jsonData};
      if (status === 200) {
        queryObj['on' + status](jsonData);
      } else if (status === 300) {
        queryObj.on300(request);
      } else {
        queryObj.onFailure(request);
      }
      this.query = queryObj;
      this.query.request = request;
    },

    runGenericQuery: function (q, opts) {
      q = q || $.trim(this.queryEl.val());
      if ($.trim(q)) {
        var runner,
            waypoints = q.toLowerCase().split(/\s+to\s+/),
            input = {q: q};
        if (waypoints.length > 1) {
          runner = 'runRouteQuery';
          this.setStart(waypoints[0]);
          this.setEnd(waypoints[1]);
        } else {
          runner = 'runGeocodeQuery';
        }
        this[runner](input, opts);
      } else {
        this.queryEl.focus();
        this.showErrors(['Please enter something to search for!']);
      }
    },

    /* Run all queries through here for consistency. */
    runQuery: function (queryClass, input, opts) {
      if (typeof input.region === 'undefined') {
        input.region = this.regionId;
      }
      this.map.closePopups();
      this.query = new queryClass(this, input,opts);
      this.query.run();
    },

    runGeocodeQuery: function (input, opts) {
      if (!input) {
        input = {
          q: $.trim(this.queryEl.val()),
          q_id: this.queryId.val()
        };
      }
      if (!input.q) {
        this.queryEl.focus();
        this.showErrors(['Please enter an address!']);
      } else {
        this.runQuery(query.GeocodeQuery, input, opts);
      }
    },

    runRouteQuery: function (input, opts) {
      var errors = [],
          q, start, end;
      if (!input) {
        input = {
          s: $.trim(this.startEl.val()),
          e: $.trim(this.endEl.val()),
          s_id: this.startId.val(),
          e_id: this.endId.val()
        };
      }
      q = input.q;
      start = input.s;
      end = input.e;
      if (q || (start && end)) {
        if ((start && end) && start === end) {
          this.showErrors(['Start and end are the same']);
        } else {
          $.each(this.results, function (id, result) {
            if (result.constructor === Route) {
              this.removeResult(result);
            }
          }.bind(this));
          this.runQuery(query.RouteQuery, input, opts);
        }
      } else {
        if (!start) {
          errors.push('Please enter a start address');
          this.startEl.focus();
        }
        if (!end) {
          errors.push('Please enter an end address');
          if (start) {
            this.endEl.focus();
          }
        }
        this.showErrors(errors);
      }
    },

    getDirectionsTo: function (where, id) {
      this.setAsEnd(where, id);
      if (this.startEl.val()) {
        this.runRouteQuery();
      } else {
        this.startEl.focus();
      }
    },

    getDirectionsFrom: function (where, id) {
      this.setAsStart(where, id);
      if (this.endEl.val()) {
        this.runRouteQuery();
      } else {
        this.endEl.focus();
      }
    },

    setStatus: function (msg) {
      this.status.show();
      this.status.html(msg);
    },

    clearStatus: function () {
      this.status.hide();
      this.status.html('');
    },

    showErrors: function (errors) {
      this.spinner.hide();
      var content = [];
      $.each(errors, function (i, error) {
        content.push('<div class="alert alert-danger">', error, '</div>');
      });
      content = content.join(''),
      this.showContent(content);
    },

    removeResult: function (result) {
      if (typeof result === 'string') {
        result = this.results[result];
      }
      delete this.results[result.id];
      $.each(result.overlays, function (i, overlay) {
        this.map.removeOverlay(overlay);
      }.bind(this));
    },

    removeResults: function () {
      if (confirm('Remove all of your results and clear the map?')) {
        this.setQuery('');
        this.setStart('');
        this.setEnd('');
        this.selectInputTab('');
        this.showContent('');
        $.each(this.results, function (id, result) {
          this.removeResult(result);
        }.bind(this));
      }
    },

    reverseDirections: function (input) {
      this.setQuery([input.s, input.e].join(' to '));
      this.setStart(input.s, input.s_id);
      this.setEnd(input.e, input.e_id);
      this.runRouteQuery(input);
    }
  };


  return byCycle.UI;
});
