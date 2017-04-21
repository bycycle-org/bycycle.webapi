define([
  'jquery',
  'bycycle',
  'bycycle/map',
  'bycycle/query',
  'bycycle/result'
], function (
  $,
  bycycle,
  map,
  query,
  result
) {

   var LookupQuery = query.LookupQuery,
       Route = result.Route,
       RouteQuery = query.RouteQuery;

  byCycle.UI = {
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

        this.assignUIElements();
        this.createEventHandlers();
        this.onResize();

        this.map = new map.Map();
        this.mapContextMenu = new map.MapContextMenu(this, this.map);
        this.map.drawLine(byCycle.mapConfig.boundary);
        this.map.getView().fit(byCycle.mapConfig.bbox);

        if (typeof zoom !== 'undefined') {
          this.map.getView().setZoom(zoom)
        }

        this.handleQuery();

        this.clearStatus();
        this.spinner.hide();
      }.bind(this));
    },

    assignUIElements: function () {
      this.inputDropdown = $('#input-dropdown');
      this.selectedInput = $('#selected-input');
      this.queryForm = $('#query-form');
      this.routeForm = $('#route-form');

      this.queryEl = $('#q');
      this.queryId = $('#q-id')
      this.queryPoint = $('#q-point');

      this.startEl = $('#s');
      this.startId = $('#s-id')
      this.startPoint = $('#s-point')

      this.endEl = $('#e');
      this.endId = $('#e-id')
      this.endPoint = $('#e-point');

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


      this.inputDropdown.on('hide.bs.dropdown', function () {
        this.updateInputDropdownIcon();
      }.bind(this));

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

    /* Services Input ********************************************************/

    setQuery: function (val, id, point) {
      this.queryEl.val(val);
      this.queryId.val(id || '');
      this.queryPoint.val(point || '');
    },

    setStart: function (val, id, point) {
      this.startEl.val(val);
      this.startId.val(id || '');
      this.startPoint.val(point || '');
    },

    setEnd: function (val, id, point) {
      this.endEl.val(val);
      this.endId.val(id || '');
      this.endPoint.val(point || '');
    },

    selectInputTab: function (service) {
      if (service === 'route') {
        $('#get-directions-tab a:first').tab('show');
      } else {
        $('#search-map-tab a:first').tab('show');
      }
      this.updateInputDropdownIcon();
    },

    updateInputDropdownIcon: function () {
      var selected = this.inputDropdown.find('li.active a span');
      this.selectedInput.removeClass().addClass(selected.attr('class'));
    },

    swapStartAndEnd: function () {
      var s = this.startEl.val(),
          sId = this.startId.val(),
          sPoint = this.startPoint.val();
      this.setStart(this.endEl.val(), this.endId.val(), this.endPoint.val());
      this.setEnd(s, sId, sPoint);
    },

    setAsStart: function (addr, id, point) {
      this.setStart(addr, id, point);
      this.selectInputTab('route');
      this.startEl.focus();
    },

    setAsEnd: function (addr, id, point) {
      this.setEnd(addr, id, point);
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

    runGenericQuery: function (input, opts) {
      var q;
      if (!input) {
        input = {
          q: $.trim(this.queryEl.val()),
          q_id: $.trim(this.queryId.val()),
          q_point: $.trim(this.queryPoint.val())
        };
      }
      q = input.q;
      if ($.trim(q)) {
        var runner,
            waypoints = q.toLowerCase().split(/\s+to\s+/);
        if (waypoints.length > 1) {
          runner = 'runRouteQuery';
          this.setStart(waypoints[0]);
          this.setEnd(waypoints[waypoints.length - 1]);
        } else {
          runner = 'runLookupQuery';
        }
        this[runner](input, opts);
      } else {
        this.queryEl.focus();
        this.showErrors(['Please enter something to search for!']);
      }
    },

    /* Run all queries through here for consistency. */
    runQuery: function (queryClass, input, opts) {
      this.map.closePopups();
      this.query = new queryClass(this, input,opts);
      this.query.run();
    },

    runLookupQuery: function (input, opts) {
      if (!input) {
        input = {
          q: $.trim(this.queryEl.val()),
          q_id: this.queryId.val(),
          q_point: this.queryPoint.val()
        };
      }
      if (!input.q) {
        this.queryEl.focus();
        this.showErrors(['Please enter an address!']);
      } else {
        this.runQuery(LookupQuery, input, opts);
      }
    },

    runRouteQuery: function (input, opts) {
      var errors = [],
          q, start, end;
      if (!input) {
        input = {
          s: $.trim(this.startEl.val()),
          s_id: this.startId.val(),
          s_point: $.trim(this.startPoint.val()),
          e: $.trim(this.endEl.val()),
          e_id: this.endId.val(),
          e_point: $.trim(this.endPoint.val())
        };
      }
      q = input.q;
      start = input.s;
      end = input.e;
      if (q || (start && end)) {
        if ((start && end) &&
              start === end &&
              input.s_id === input.e_id &&
              input.s_point === input.e_point) {
          this.showErrors(['Start and end are the same']);
        } else {
          $.each(this.results, function (id, result) {
            if (result.constructor === Route) {
              this.removeResult(result);
            }
          }.bind(this));
          this.runQuery(RouteQuery, input, opts);
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

    getDirectionsFrom: function (where, id, point) {
      this.setAsStart(where, id, point);
      if (this.endEl.val()) {
        this.runRouteQuery();
      } else {
        this.endEl.focus();
      }
    },

    getDirectionsTo: function (where, id, point) {
      this.setAsEnd(where, id, point);
      if (this.startEl.val()) {
        this.runRouteQuery();
      } else {
        this.startEl.focus();
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
        overlay.source.removeFeature(overlay);
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
      this.setStart(input.s, input.s_id, input.s_point);
      this.setEnd(input.e, input.e_id, input.e_point);
      this.runRouteQuery(input);
    }
  };


  return byCycle.UI;
});
