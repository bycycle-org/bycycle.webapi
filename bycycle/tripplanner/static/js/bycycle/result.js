define(['jquery', 'bycycle'], function ($, bycycle) {

  /**
   * Result Base Class
   *
   * @param data {Object} Raw result data
   */
  var Result = function (data) {
    $.extend(this, data);
    this.overlays = [];
  };

  Result.prototype = {
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
          address = this.address,
          oneLineAddress = address.replace(/\n+/, ', ');
      this.coordinates = this.lat_long.coordinates,
      this.htmlAddress = address.replace(/\n+/, '<br>');
      this.oneLineAddress = oneLineAddress;
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
                  byCycle.UI.getDirectionsTo(oneLineAddress, id);
                }
              ))
          )
          .append(
            $('<div>')
              .append($('<a>').attr('href', '#').text('Get directions from').click(
                function (event) {
                  event.preventDefault();
                  byCycle.UI.getDirectionsFrom(oneLineAddress, id);
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
    }
  });


  return {
    Geocode: Geocode,
    Route: Route
  }
});
