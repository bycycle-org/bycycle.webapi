define(['jquery', 'bycycle'], function ($, bycycle) {

  /**
   * Result Base Class
   *
   * @param data {Object} Raw result data
   */
  var Result = function (data) {
    $.extend(this, data);
    this.id = this.sanitizeId(this.makeId(this));
    this.overlays = [];
  };

  Result.prototype = {
    sanitizeId: function (id) {
      return id.replace(/[^a-z0-9-]+/ig, '-').toLowerCase();
    },

    addOverlay: function () {
      var overlays = $.makeArray(arguments);
      for (var i = 0, len = overlays.length; i < len; ++i) {
        this.overlays.push(overlays[i]);
      }
    }
  };


  var Geocode = bycycle.inheritFrom(Result, {
    constructor: function (data) {
      this.superType.call(this, data);
      var id = this.id,
          address = this.address;
      this.coordinates = this.lat_long.coordinates,
      this.htmlAddress = address.replace(/\n+/, '<br>');
      this.popup = $('<div>');
      this.popupContent = (
        $('<div>')
          .append(
            $('<div>').html(this.htmlAddress))
          .append(
            $('<div>')
              .append($('<a>').attr('href', '#').text('Get directions to').click(
                function (event) {
                  event.preventDefault();
                  byCycle.UI.getDirectionsTo(address);
                }
              ))
          )
          .append(
            $('<div>')
              .append($('<a>').attr('href', '#').text('Get directions from').click(
                function (event) {
                  event.preventDefault();
                  byCycle.UI.getDirectionsFrom(address);
                }
              ))
          )
          .append(
            $('<div>')
              .append(
                $('<a>').attr('href', '#').text('Remove').click(function (event) {
                  event.preventDefault();
                  byCycle.UI.removeResult(id);
                })
              )
          )
        );
    },

    makeId: function (result) {
      return 'geocode-result-' + result.address;
    }
  });


  var Route = bycycle.inheritFrom(Result, {
    constructor: function (data) {
      this.superType.call(this, data);
      var linestring = this.linestring,
          coordinates = linestring.coordinates;
      this.start = new Geocode(this.start);
      this.start.popupContent = this.start.htmlAddress;
      this.end = new Geocode(this.end);
      this.end.popupContent = this.end.htmlAddress;
      this.coordinates = coordinates;
      this.encodedPolyline = this.linestring.encoded;
    },

    makeId: function (result) {
      return 'route-result-' + result.start.address + '-' + result.end.address;
    }
  });


  return {
    Geocode: Geocode,
    Route: Route
  }
});
