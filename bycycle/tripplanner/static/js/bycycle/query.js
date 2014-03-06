define(['jquery', 'bycycle', 'bycycle/result'], function ($, bycycle, result) {

  var Geocode = result.Geocode,
      Route = result.Route;

  /**
   * Query Base Class
   *
   * @param input {Object}
   * @param opts {Object|undefined}
   *        processingMessage: 'Processing...'
   */
  var Query = function (ui, input, opts) {
    opts = opts || {};
    this.ui = ui;
    this.input = input;
    this.processingMessage = opts.processingMessage || this.processingMessage;
    this.ui.selectInputTab(this.service);
  };

  Query.prototype = {

    processingMessage: 'Processing...',

    run: function () {
      var path = [this.service, 'find'].join('/'),
          url = [bycycle.prefix, path].join(''),
          params = $.param(this.input),
          bookmarkHref,
          bookmarkParams = {
            zoom: this.ui.map.getView().getZoom()
          };

      bookmarkHref = [url, params].join('?');
      bookmarkParams = $.param(bookmarkParams);
      bookmarkHref = [bookmarkHref, bookmarkParams].join('&');
      this.ui.bookmarkLink.attr('href', bookmarkHref);

      this.ui.setStatus(this.processingMessage);

      this.request = $.ajax({
        url: url,
        dataType: 'json',
        data: params,
        context: this,
        beforeSend: this.onLoading,
        success: this.on200,
        statusCode: {
          300: this.on300
        },
        error: this.onFailure,
        complete: this.onComplete
      });
    },

    onLoading: function (request) {
      this.ui.spinner.show();
      this.ui.setStatus(this.processingMessage);
    },

    on200: function (data) {
      var results = [];
      try {
        this.ui.showContent(data.fragment);
        $.each(data.results, function (i, result) {
          result = this.makeResult(result);
          results.push(result);
          this.ui.results[result.id] = result;
        }.bind(this));
        this.processResults(results);
      } catch (e) {
        console && console.log(e.toString());
        if (bycycle.debug) {
          throw e;
        }
      }

      this.ui.isFirstResult = false;
    },

    makeResult: function (result) {
      var result = new this.resultType(result);
      if (this.ui.results.hasOwnProperty(result.id)) {
        this.ui.removeResult(result.id);
      }
      return result;
    },

    on300: function (request) {
      this.onFailure(request);
    },

    onFailure: function (request) {
      var fragment = request.responseJSON.fragment;
      this.ui.showContent(fragment);
    },

    onComplete: function (request, status) {
      this.ui.clearStatus();
      this.ui.spinner.hide();
      this.httpStatus = request.status;
    }
  };


  /**
   * Geocode Query
   *
   * @param input {Object} Should contain `q`
   */
  var GeocodeQuery = bycycle.inheritFrom(Query, {

    service: 'geocode',
    resultType: result.Geocode,
    processingMessage: 'Looking up address...',

    on300: function (request) {
      var ui = this.ui;
      this.superType.prototype.on300.call(this, request);
      $('.select-location').each(function (i, link) {
        link = $(link);
        link.on('click', function (event) {
          var result = new Geocode(request.responseJSON.results[i]);
          event.preventDefault();
          ui.setQuery(result.oneLineAddress, result.id);
          ui.runGeocodeQuery({
            q: result.oneLineAddress,
            q_id: result.id
          });
          link.off('click');
        });
      });
    },

    processResults: function (results) {
      var ui = this.ui,
          map = ui.map;
      $.each(results, function (i, result) {
        var coords = map.transform(result.lat_long.coordinates);
        ui.setQuery(result.oneLineAddress, result.id);
        map.getView().setCenter(coords);
        if (ui.isFirstResult) {
          map.getView().setZoom(map.streetLevelZoom);
        }
        map.placeGeocodeMarker(result);
      });
    }
  });


  /**
   * Route Query
   *
   * @param input {Object} Should contain `s` and `e`
   * @param opts
   *        processingMessage='Finding route...'
   *
   */
  var RouteQuery = bycycle.inheritFrom(Query, {

    service: 'route',
    resultType: Route,
    processingMessage: 'Finding route...',

    on300: function (request) {
      this.superType.prototype.on300.call(this, request);
      var results = request.responseJSON.results,
          ui = this.ui,
          // Slots in results that require a selection.
          choiceIndexes = [],
          // Index into choiceIndexes; it points to the index that
          // contains the index of the next slot in results that
          // requires a selection.
          choiceIndex = 0,
          offset = 0,
          q = [],
          qId = [];

      $.each(results, function (i, item) {
        var geocode;
        if ($.isArray(item)) {
          choiceIndexes.push(i);
          q.push(null);
          qId.push(null);
        } else {
          geocode = new Geocode(item);
          q.push(geocode.oneLineAddress);
          qId.push(geocode.id);
        }
      });

      $('.select-location').each(function (i, link) {
        link = $(link);

        link.on('click', function (event) {
          var resultIndex = choiceIndexes[choiceIndex++],
              choices = results[resultIndex],
              choice = new Geocode(choices[i - offset]),
              container = link.closest('.route-choice'),
              next = container.next('.route-choice');

          event.preventDefault();
          link.off('click');
          container.remove();

          q[resultIndex] = choice.oneLineAddress;
          qId[resultIndex] = choice.id;
          offset += choices.length;

          if (resultIndex === 0) {
            ui.setStart(choice.oneLineAddress);
          } else if (resultIndex === 1) {
            ui.setEnd(choice.oneLineAddress);
          }

          if (next.length) {
            next.show();
          } else {
            q = q.join(' to ');
            qId = qId.join(';');
            ui.setQuery(q, qId);
            ui.runRouteQuery({q: q, q_id: qId});
          }
        });
      });
    },

    processResults: function (results) {
      var ui = this.ui,
          map = ui.map;
      $.each(results, function (i, route) {
        var bounds = map.transformBounds(route.bounds_array),
            startMarker, endMarker;
        ui.setStart(route.start.oneLineAddress, route.start.id);
        ui.setEnd(route.end.oneLineAddress, route.end.id);
        map.getView().fitExtent(bounds, map.getSize());
        startMarker = map.placeGeocodeMarker(route.start, {
          markerClass: 'start-marker',
          glyphClass: 'glyphicon-play'
        });
        endMarker = map.placeGeocodeMarker(route.end, {
          markerClass: 'end-marker',
          glyphClass: 'glyphicon-stop'
        });
        map.drawRoute(route);
        route.addOverlay(startMarker, endMarker);
      });
    }
  });


  return {
    GeocodeQuery: GeocodeQuery,
    RouteQuery: RouteQuery
  };
});
