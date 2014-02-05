/**
 * Query Base Class
 *
 * @param opts
 *        processing_message='Processing...'
 *        input=undefined
 */
byCycle.UI.Query = function(service, form, opts) {
  this.ui = byCycle.UI;
  this.service = service;
  this.form = form;
  if (opts) {
    this.processing_message = opts.processing_message || 'Processing...';
    this.input = opts.input;  // Hash or undefined
  }
};

byCycle.UI.Query.prototype = {
  run: function() {
    var errors = this.before();
    if (errors) {
      this.ui.showErrors(errors);
    } else {
      this.doQuery();
    }
  },

  before: function() {
    this.start_ms = new Date().getTime();
    this.ui.status.html(this.processing_message);
    return null;
  },

  doQuery: function() {
    var path = [this.service, 'find'].join('/'),
        url = [byCycle.prefix, path].join(''),
        params = this.input ? $.param(this.input) : this.form.serialize(),
        bookmarkHref,
        bookmarkParams = {
          zoom: this.ui.map.getZoom()
        },
        mapType = byCycle.getParamVal('map_type');

    if (typeof mapType !== 'undefined' && mapType !== 'base') {
      bookmarkParams.map_type = mapType;
    }
    bookmarkHref = [url, params].join('?');
    bookmarkParams = $.param(bookmarkParams);
    bookmarkHref = [bookmarkHref, bookmarkParams].join('&');
    this.ui.bookmark_link.attr('href', bookmarkHref);

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

  onLoading: function(request) {
    this.ui.spinner.show();
    this.ui.status.html(this.processing_message);
  },

  on200: function(data) {
    var results = [];
    try {
      this.ui.showContent(data.fragment);
      $.each(data.results, function (i, result) {
        result = this.makeResult(result);
        results.push(result);
        this.ui.results[this.service][result.id] = result;
      }.bind(this));
      this.processResults(results);
    } catch (e) {
      console && console.log(e.toString());
      if (debug) {
        throw e;
      }
    }
    this.ui.is_first_result = false;
  },

  on300: function(request) {
    this.onFailure(request);
  },

  onFailure: function(request) {
    var fragment = request.responseJSON.fragment;
    this.ui.showContent(fragment);
  },

  onComplete: function(request, status) {
    this.ui.spinner.hide();
    this.http_status = request.status;
    this.ui.status.html(this.getElapsedTimeMessage());
  },

  makeResult: function (result) {
    var id = [this.service, 'result', new Date().getTime()].join('_'),
        result = new byCycle.UI.Result(this.ui, id, result, this.service);
    return result;
  },

  getElapsedTimeMessage: function() {
    var elapsed_time_msg = '';
    if (this.http_status < 400 && this.start_ms) {
      elapsed_time = (new Date().getTime() - this.start_ms) / 1000.0;
      var s = '';
      if (elapsed_time < 1) {
        elapsed_time = ' less than 1 ';
      } else if (elapsed_time > 1) {
        s = 's';
      }
      elapsed_time_msg = ['in ', elapsed_time, ' second', s].join('');
    }
    var status_message = this.ui.status_messages[this.http_status || 200];
    elapsed_time_msg = [status_message, elapsed_time_msg].join(' ');
    return elapsed_time_msg;
  }
};


/**
 * Geocode Query
 *
 * @param opts
 *        form=byCycle.UI.query_form
 *        processing_message='Locating address...'
 *        input=undefined
 */

byCycle.UI.GeocodeQuery = byCycle.inheritFrom(byCycle.UI.Query, {
  constructor: function(opts) {
    opts = opts || {};
    var ui = byCycle.UI;
    var form = opts.form || ui.query_form;
    opts.processing_message = opts.processing_message || 'Looking up address...';
    this.superType.call(this, 'geocode', form, opts);
  },

  before: function() {
    this.superType.prototype.before.apply(this, arguments);
    var q;
    if (typeof this.input === 'undefined') {
      q = $.trim(this.ui.q_el.val());
      if (!q) {
        this.ui.q_el.focus();
        return ['Please enter an address!'];
      }
    }
    return null;
  },

  on300: function (request) {
    this.superType.prototype.on300.call(this, request);
    $('.select-location').each(function (i, link) {
      $(link).on('click', function (event) {
        event.preventDefault();
        byCycle.UI.selectGeocode(link, i);
        $(link).off('click');
      });
    });
  },

  processResults: function (results) {
    var zoom = this.ui.is_first_result ? this.ui.map.default_zoom : undefined;
    $.each(results, function (i, result) {
      var r = result.result,
          coords = r.lat_long.coordinates,
          point = { x: coords[0], y: coords[1] },
          marker = this.ui.map.placeGeocodeMarker(point, r.address, zoom);
      result.addOverlay(marker);
    }.bind(this));
  }
});


/**
 * Route Query
 *
 * @param opts
 *        form=byCycle.UI.route_form
 *        processing_message='Finding route...'
 *        input=undefined
 *
 */
byCycle.UI.RouteQuery = byCycle.inheritFrom(byCycle.UI.Query, {
  constructor: function(opts) {
    opts = opts || {};
    opts.processing_message = opts.processing_message || 'Finding route...';
    var ui = byCycle.UI,
        form = opts.form || ui.route_form,
        service = 'route';
    this.superType.call(this, service, form, opts);
    this.ui.selectInputTab(service);
  },

  before: function() {
    this.superType.prototype.before.apply(this, arguments);
    if (typeof this.input === 'undefined') {
      // Use form fields for input
      var errors = [],
          s = $.trim(this.ui.s_el.val()),
          e = $.trim(this.ui.e_el.val());
      if (!(s && e)) {
        if (!s) {
          errors.push('Please enter a start address');
          this.ui.s_el.focus();
        }
        if (!e) {
          errors.push('Please enter an end address');
          if (s) {
            this.ui.e_el.focus();
          }
        }
        return errors;
      } else if (s === e) {
        return ['Start and end addresses are the same'];
      }
    }
    return null;
  },

  on300: function (request) {
    this.superType.prototype.on300.call(this, request);
    var route_choices = [],
        multiple_choices = [];
    $.each(request.responseJSON.results, function (i, item) {
      if ($.isArray(item)) {
        route_choices.push(null);
        multiple_choices = multiple_choices.concat(item);
      } else {
        route_choices.push(item.address.replace('\n', ', '));
      }
    });
    this.route_choices = route_choices;
    $('.select-location').each(function (i, link) {
      $(link).on('click', function (event) {
        event.preventDefault();
        byCycle.UI.selectRouteGeocode(link, multiple_choices[i]);
        $(link).off('click');
      });
    });
  },

  processResults: function (results) {
    var route,
        linestring,
        line,
        markers,
        startPoint, endPoint,
        startMarker, endMarker,
        color = this.ui.route_line_color,
        ui = this.ui,
        map = ui.map,
        centerAndZoomToBounds = map.centerAndZoomToBounds.bind(map),
        placeMarkers = map.placeMarkers.bind(map),
        addListener = map.addListener.bind(map),
        drawPolyLine;

    if (map.drawPolyLineFromEncodedPoints) {
      drawPolyLine = map.drawPolyLineFromEncodedPoints.bind(map);
    } else {
      drawPolyLine = map.drawPolyLine.bind(map);
    }

    $.each(results, function (i, result) {
      route = result.result;
      linestring = route.linestring;

      // Zoom to linestring
      // TODO: Compute this in back end
      centerAndZoomToBounds(route.bounds, route.center);

      startPoint = linestring.coordinates[0];
      startPoint = {x: startPoint[0], y: startPoint[1]};
      endPoint = linestring.coordinates[linestring.coordinates.length - 1];
      endPoint = {x: endPoint[0], y: endPoint[1]};

      // Place from and to markers
      markers = placeMarkers(
        [startPoint, endPoint], [map.start_icon, map.end_icon]);

      // Add listeners to start and end markers
      startMarker = markers[0];
      endMarker = markers[1];
      addListener(startMarker, 'click', function() {
        map.setCenter(startMarker.getPosition());
      });
      addListener(endMarker, 'click', function() {
        map.setCenter(endMarker.getPosition());
      });

      // Draw linestring
      if (map.drawPolyLineFromEncodedPoints) {
        line = drawPolyLine(route.google_points, {strokeColor: color});
      } else {
        line = drawPolyLine(linestring, {strokeColor: color});
      }

      result.addOverlay(startMarker, endMarker, line);
    });
  }
});
