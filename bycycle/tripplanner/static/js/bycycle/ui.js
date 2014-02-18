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
      $('#loading-status').html('Loading...');
      $('#spinner').show();
      $(document).ready(function () {
        this.region = regions.regions[this.regionId];

        this.assignUIElements();
        this.createEventHandlers();
        this.onResize();

        this.map = new map.Map({target: 'map-pane'});
        this.mapContextMenu = new map.MapContextMenu(this, this.map);

        this.setRegion(this.regionId);
        this.handleQuery();

        $('#loading-status').remove();
        this.spinner.hide();
      }.bind(this));
    },

    assignUIElements: function () {
      this.queryForm = $('#query-form');
      this.routeForm = $('#route-form');
      this.queryEl = $('#q');
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

      this.queryForm.on('submit', function (event) {
        event.preventDefault();
        this.runGenericQuery();
      }.bind(this));

      this.routeForm.on('submit', function (event) {
        event.preventDefault();
        this.runRouteQuery();
      }.bind(this));

      $('#swap-s-and-e').on('click', this.swapStartAndEnd.bind(this));

      $('#clear-map-link').on('click', function () {
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

    focusServiceElement: function (service) {
      service == 'route' ? this.startEl.focus() : this.queryEl.focus();
    },

    selectInputTab: function (service) {
      if (service === 'route') {
        $('#find-route-tab a:first').tab('show');
      } else {
        $('#search-map-tab a:first').tab('show');
      }
    },

    swapStartAndEnd: function () {
      var s = this.startEl.val();
      this.startEl.val(this.endEl.val());
      this.endEl.val(s);
    },

    setAsStart: function (addr) {
      this.startEl.val(addr.replace(/\n+/, ', '));
      this.selectInputTab('route');
      this.startEl.focus();
    },

    setAsEnd: function (addr) {
      this.endEl.val(addr.replace(/\n+/, ', '));
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
      if (q) {
        var waypoints = q.toLowerCase().split(/\s+to\s+/),
            s = waypoints[0],
            e = waypoints[1];
        if (waypoints.length > 1) {
          this.startEl.val(s);
          this.endEl.val(e);
          this.runRouteQuery({q: q}, opts);
        } else {
          this.runGeocodeQuery({q: q}, opts);
        }
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
        input = {q: $.trim(this.queryEl.val())};
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
          e: $.trim(this.endEl.val())
        };
      }
      if (!input.s_id) {
        input.s_id = this.startId.val();
      }
      if (!input.e_id) {
        input.e_id = this.endId.val();
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

    getDirectionsTo: function (where) {
      this.setAsEnd(where);
      if (this.startEl.val()) {
        this.runRouteQuery();
      } else {
        this.startEl.focus();
      }
    },

    getDirectionsFrom: function (where) {
      this.setAsStart(where);
      if (this.endEl.val()) {
        this.runRouteQuery();
      } else {
        this.endEl.focus();
      }
    },

    showErrors: function (errors) {
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
    selectGeocode: function (selectLink, i) {
      var data = this.query.request.responseJSON,
          result = this.query.makeResult(data.results[i]),
          panel = $(selectLink).closest('.panel');
      this.results[result.id] = result;
      this.query.processResults([result]);
      this.showContent(panel.clone().wrap('<div>').parent().html());
      $('.set-as-s-or-e').show();
      if (this.isFirstResult) {
        this.map.getView().setZoom(this.map.streetLevelZoom);
      } else {
        this.isFirstResult = false;
      }
    },

    /**
     * Select from multiple matching geocodes for a route
     */
    selectRouteGeocode: function (selectLink, choice) {
      var routeChoices = this.query.routeChoices,
          container = $(selectLink).closest('.route-choice'),
          next = container.next('.route-choice'),
          startId = this.startId,
          endId = this.endId,
          addr;
      if (choice.number) {
        addr = [choice.number, choice.network_id].join('-');
      } else {
        addr = choice.network_id
      }
      $.each(routeChoices, function (i, v) {
        if (v === null) {
          if (i === 0) {
            startId.val(addr);
          } else if (i === 1) {
            endId.val(addr);
          }
          routeChoices[i] = addr;
          return false;
        }
      })
      container.remove();
      if (next.length) {
        next.show();
      } else {
        this.runRouteQuery({
          q: this.query.routeChoices.join(' to ')
        });
      }
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
        $.each(this.results, function (id, result) {
          this.removeResult(result);
        }.bind(this));
        this.showContent('');
      }
    },

    reverseDirections: function (s, e) {
      if (!(s && e)) {
        s = this.endEl.val();
        e = this.startEl.val();
      }
      this.startEl.val(s);
      this.endEl.val(e);
      this.runRouteQuery({s: s, e: e});
    }
  };


  return byCycle.UI;
});
