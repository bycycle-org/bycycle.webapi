define(['bycycle', 'result'], function (bycycle, result) {

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

      this.startMs = new Date().getTime();
      this.ui.status.html(this.processingMessage);

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
      this.ui.status.html(this.processingMessage);
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
      this.ui.spinner.hide();
      this.httpStatus = request.status;
      this.ui.status.html(this.getElapsedTimeMessage());
    },

    getElapsedTimeMessage: function () {
      var elapsedTime,
          elapsedTimeMsg = '';
      if (this.httpStatus < 400 && this.startMs) {
        elapsedTime = (new Date().getTime() - this.startMs) / 1000.0;
        var s = '';
        if (elapsedTime < 1) {
          elapsedTime = ' less than 1 ';
        } else if (elapsedTime > 1) {
          s = 's';
        }
        elapsedTimeMsg = ['in ', elapsedTime, ' second', s].join('');
      }
      var status_message = this.ui.statusMessages[this.httpStatus || 200];
      elapsedTimeMsg = [status_message, elapsedTimeMsg].join(' ');
      return elapsedTimeMsg;
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
        $(link).on('click', function (event) {
          event.preventDefault();
          ui.selectGeocode(link, i);
          $(link).off('click');
        });
      });
    },

    processResults: function (results) {
      var map = this.ui.map,
          zoom = this.ui.isFirstResult ? map.streetLevelZoom : undefined;
      $.each(results, function (i, result) {
        var coords = map.transform(result.lat_long.coordinates);
        map.getView().setCenter(coords);
        if (typeof zoom !== 'undefined') {
          map.getView().setZoom(zoom);
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
    resultType: result.Route,
    processingMessage: 'Finding route...',

    on300: function (request) {
      this.superType.prototype.on300.call(this, request);
      var ui = this.ui,
          routeChoices = [],
          multipleChoices = [];
      $.each(request.responseJSON.results, function (i, item) {
        if ($.isArray(item)) {
          routeChoices.push(null);
          multipleChoices = multipleChoices.concat(item);
        } else {
          routeChoices.push(item.address.replace('\n', ', '));
        }
      });
      this.routeChoices = routeChoices;
      $('.select-location').each(function (i, link) {
        $(link).on('click', function (event) {
          event.preventDefault();
          ui.selectRouteGeocode(link, multipleChoices[i]);
          $(link).off('click');
        });
      });
    },

    processResults: function (results) {
      var map = this.ui.map;
      $.each(results, function (i, route) {
        var bounds = map.transformBounds(route.bounds_array),
            startMarker, endMarker;
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
