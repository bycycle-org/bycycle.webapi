define(['jquery', 'bycycle', 'bycycle/result'], function ($, bycycle, result) {

  var LookupResult = result.LookupResult,
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
   * LookupResult Query
   *
   * @param input {Object} Should contain `q`
   */
  var LookupQuery = bycycle.inheritFrom(Query, {

    service: 'lookup',
    resultType: LookupResult,
    processingMessage: 'Looking up address...',

    on300: function (request) {
      var ui = this.ui;
      this.superType.prototype.on300.call(this, request);
      $('.select-location').each(function (i, link) {
        link = $(link);
        link.on('click', function (event) {
          var result = new LookupResult(request.responseJSON.results[i]);
          event.preventDefault();
          ui.setQuery(result.oneLineAddress, result.id, result.llString);
          ui.runLookupQuery({
            q: result.oneLineAddress,
            q_id: result.id,
            q_point: result.llString
          });
          link.off('click');
        });
      });
    },

    processResults: function (results) {
      var ui = this.ui,
          map = ui.map;
      $.each(results, function (i, result) {
        ui.setQuery(result.oneLineAddress, result.id, result.llString);
        map.getView().setCenter(result.point.coordinates);
        if (ui.isFirstResult) {
          map.getView().setZoom(map.streetLevelZoom);
        }
        map.placeLookupMarker(result);
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
          lastIndex = results.length - 1,
          ui = this.ui,
          // Slots in results that require a selection.
          choiceIndexes = [],
          // Index into choiceIndexes; it points to the index that
          // contains the index of the next slot in results that
          // requires a selection.
          choiceIndex = 0,
          offset = 0,
          q = [],
          qId = [],
          qPoint = [];

      $.each(results, function (i, item) {
        var result;
        if ($.isArray(item)) {
          choiceIndexes.push(i);
          q.push(null);
          qId.push(null);
          qPoint.push(null);
        } else {
          result = new LookupResult(item);
          q.push(result.oneLineAddress);
          qId.push(result.id);
          qPoint.push(result.llString);
        }
      });

      $('.select-location').each(function (i, link) {
        link = $(link);

        link.on('click', function (event) {
          var resultIndex = choiceIndexes[choiceIndex++],
              choices = results[resultIndex],
              choice = new LookupResult(choices[i - offset]),
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
          } else if (resultIndex === lastIndex) {
            ui.setEnd(choice.oneLineAddress);
          }

          if (next.length) {
            next.show();
          } else {
            q = q.join(' to ');
            qId = qId.join(';');
            qPoint = qPoint.join(';');
            ui.setQuery(q, qId, qPoint);
            ui.runRouteQuery({q: q, q_id: qId, q_point: qPoint});
          }
        });
      });
    },

    processResults: function (results) {
      var ui = this.ui,
          map = ui.map;
      $.each(results, function (i, route) {
        var startMarker, endMarker, line;
        ui.setStart(
          route.start.oneLineAddress, route.start.id, route.start.llString);
        ui.setEnd(
          route.end.oneLineAddress, route.end.id, route.end.llString);
        map.getView().fitExtent(route.bounds, map.getSize());
        startMarker = map.placeLookupMarker(route.start, {
          markerClass: 'start-marker',
          glyphClass: 'glyphicon-play'
        });
        endMarker = map.placeLookupMarker(route.end, {
          markerClass: 'end-marker',
          glyphClass: 'glyphicon-stop'
        });
        line = map.drawLine(route.coordinates);
        route.addOverlay(startMarker, endMarker, line);
      });
    }
  });


  return {
    LookupQuery: LookupQuery,
    RouteQuery: RouteQuery
  };
});
